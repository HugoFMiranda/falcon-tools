import * as pdfjsLib from '../vendor/pdfjs/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).toString();

const pdfState = {
    uploads: [],
    queue: [],
    activeUploadId: null,
    draggedQueueId: null,
    exportDownloadUrl: null,
};

document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-pdf-tool]');

    if (!root) {
        return;
    }

    if (!window.PDFLib) {
        renderFeedback(root, 'PDF-Lib could not be loaded from local assets.', true);
        return;
    }

    const elements = {
        root,
        uploadForm: root.querySelector('[data-upload-form]'),
        feedback: root.querySelector('[data-feedback]'),
        uploadList: root.querySelector('[data-upload-list]'),
        uploadCount: root.querySelector('[data-upload-count]'),
        pageBrowser: root.querySelector('[data-page-browser]'),
        pageBrowserEmpty: root.querySelector('[data-page-browser-empty]'),
        queueList: root.querySelector('[data-queue-list]'),
        queueEmpty: root.querySelector('[data-queue-empty]'),
        queueCount: root.querySelector('[data-queue-count]'),
        exportButton: root.querySelector('[data-export-button]'),
        exportResult: root.querySelector('[data-export-result]'),
        outputName: root.querySelector('[data-output-name]'),
        engineLabel: root.querySelector('[data-engine-label]'),
        resetWorkspace: root.querySelector('[data-reset-workspace]'),
        activeUploadLabel: root.querySelector('[data-active-upload-label]'),
        rangeBuilder: root.querySelector('[data-range-builder]'),
        rangeInput: root.querySelector('[data-range-input]'),
        addRangeButton: root.querySelector('[data-add-range]'),
    };

    elements.engineLabel.textContent = 'Browser-first workspace | files stay local to this tab';

    elements.uploadForm.addEventListener('submit', (event) => handleLocalFiles(event, elements));
    elements.exportButton.addEventListener('click', () => handleExport(elements));
    elements.resetWorkspace.addEventListener('click', () => resetWorkspace(elements));
    elements.addRangeButton.addEventListener('click', () => addRangeFromActiveUpload(elements));

    renderUploads(elements);
    renderQueue(elements);
});

async function handleLocalFiles(event, elements) {
    event.preventDefault();

    const input = elements.uploadForm.querySelector('input[type="file"]');
    const files = Array.from(input.files || []);

    if (files.length === 0) {
        renderFeedback(elements.root, 'Select at least one PDF file before adding it to the workspace.', true);
        return;
    }

    try {
        for (const file of files) {
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                throw new Error(`${file.name} is not a PDF file.`);
            }

            const bytes = new Uint8Array(await file.arrayBuffer());
            const pdfDocument = await pdfjsLib.getDocument({ data: bytes }).promise;
            const objectUrl = URL.createObjectURL(file);

            pdfState.uploads.push({
                id: makeId('upload'),
                originalName: file.name,
                size: file.size,
                pageCount: pdfDocument.numPages,
                file,
                bytes,
                objectUrl,
                previewCache: new Map(),
            });
        }

        input.value = '';
        renderUploads(elements);
        renderFeedback(elements.root, 'PDFs added to the local workspace. Nothing was uploaded to the server.');
    } catch (error) {
        renderFeedback(elements.root, error.message || 'Could not load the selected PDF files.', true);
    }
}

function renderUploads(elements) {
    elements.uploadCount.textContent = `${pdfState.uploads.length} file${pdfState.uploads.length === 1 ? '' : 's'}`;

    if (pdfState.uploads.length === 0) {
        elements.uploadList.innerHTML = '<div class="queue-empty">No PDFs loaded yet.</div>';
        resetPageBrowser(elements);
        return;
    }

    elements.uploadList.innerHTML = '';

    pdfState.uploads.forEach((upload) => {
        const card = document.createElement('article');
        card.className = 'upload-item';
        card.innerHTML = `
            <div>
                <div class="upload-title">${escapeHtml(upload.originalName)}</div>
                <div class="upload-meta">${formatBytes(upload.size)} | ${upload.pageCount} pages</div>
            </div>
            <div class="upload-actions">
                <button class="button button-secondary" type="button" data-action="browse">Browse pages</button>
                <button class="button button-secondary" type="button" data-action="remove">Remove</button>
            </div>
        `;

        card.querySelector('[data-action="browse"]').addEventListener('click', () => loadUploadPages(upload.id, elements));
        card.querySelector('[data-action="remove"]').addEventListener('click', () => removeUpload(upload.id, elements));

        elements.uploadList.append(card);
    });
}

async function loadUploadPages(uploadId, elements) {
    const upload = getUpload(uploadId);
    if (!upload) {
        return;
    }

    pdfState.activeUploadId = uploadId;
    elements.activeUploadLabel.textContent = `Previewing ${upload.originalName}`;
    elements.rangeBuilder.hidden = false;
    elements.pageBrowser.hidden = false;
    elements.pageBrowserEmpty.hidden = true;
    elements.pageBrowser.innerHTML = '<div class="queue-empty">Rendering PDF pages...</div>';

    try {
        const pdfDocument = await pdfjsLib.getDocument({ data: upload.bytes }).promise;
        const pageCards = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
            let previewDataUrl = upload.previewCache.get(pageNumber);

            if (!previewDataUrl) {
                const page = await pdfDocument.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 0.35 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport }).promise;
                previewDataUrl = canvas.toDataURL('image/jpeg', 0.82);
                upload.previewCache.set(pageNumber, previewDataUrl);
            }

            pageCards.push(renderPageCard(upload, pageNumber, previewDataUrl, elements));
        }

        elements.pageBrowser.innerHTML = '';
        pageCards.forEach((card) => elements.pageBrowser.append(card));
    } catch (error) {
        elements.pageBrowser.innerHTML = `<div class="queue-empty">${escapeHtml(error.message || 'Could not render the PDF pages.')}</div>`;
    }
}

function renderPageCard(upload, pageNumber, previewDataUrl, elements) {
    const pageCard = document.createElement('article');
    pageCard.className = 'page-card';
    pageCard.innerHTML = `
        <img src="${previewDataUrl}" alt="Preview of page ${pageNumber} from ${escapeHtml(upload.originalName)}">
        <div class="page-card-meta">Page ${pageNumber}</div>
        <button class="button button-secondary" type="button">Add to queue</button>
    `;

    pageCard.querySelector('button').addEventListener('click', () => {
        addQueueItem(upload, pageNumber);
        renderQueue(elements);
    });

    return pageCard;
}

function addRangeFromActiveUpload(elements) {
    const upload = getUpload(pdfState.activeUploadId);
    if (!upload) {
        renderFeedback(elements.root, 'Select a PDF before adding a page range.', true);
        return;
    }

    try {
        const pageNumbers = parsePageRange(elements.rangeInput.value, upload.pageCount);
        pageNumbers.forEach((pageNumber) => addQueueItem(upload, pageNumber));
        elements.rangeInput.value = '';
        renderQueue(elements);
        renderFeedback(elements.root, `Added ${pageNumbers.length} page${pageNumbers.length === 1 ? '' : 's'} from ${upload.originalName}.`);
    } catch (error) {
        renderFeedback(elements.root, error.message, true);
    }
}

function addQueueItem(upload, pageNumber) {
    pdfState.queue.push({
        queueId: makeId('queue'),
        uploadId: upload.id,
        uploadName: upload.originalName,
        pageNumber,
    });
}

function renderQueue(elements) {
    elements.queueCount.textContent = `${pdfState.queue.length} page${pdfState.queue.length === 1 ? '' : 's'} selected`;
    elements.queueEmpty.hidden = pdfState.queue.length > 0;
    elements.queueList.innerHTML = '';

    if (pdfState.exportDownloadUrl) {
        URL.revokeObjectURL(pdfState.exportDownloadUrl);
        pdfState.exportDownloadUrl = null;
    }

    elements.exportResult.hidden = true;
    elements.exportResult.innerHTML = '';

    if (pdfState.queue.length === 0) {
        return;
    }

    pdfState.queue.forEach((item, index) => {
        const row = document.createElement('article');
        row.className = 'queue-item';
        row.draggable = true;
        row.dataset.queueId = item.queueId;
        row.innerHTML = `
            <div>
                <div class="queue-title">${index + 1}. ${escapeHtml(item.uploadName)}</div>
                <div class="queue-meta">Page ${item.pageNumber} | Drag to reorder</div>
            </div>
            <div class="queue-item-actions">
                <button class="button button-secondary" type="button" data-action="up">Up</button>
                <button class="button button-secondary" type="button" data-action="down">Down</button>
                <button class="button button-secondary" type="button" data-action="remove">Remove</button>
            </div>
        `;

        row.querySelector('[data-action="up"]').addEventListener('click', () => moveQueueItem(index, -1, elements));
        row.querySelector('[data-action="down"]').addEventListener('click', () => moveQueueItem(index, 1, elements));
        row.querySelector('[data-action="remove"]').addEventListener('click', () => {
            pdfState.queue.splice(index, 1);
            renderQueue(elements);
        });
        row.addEventListener('dragstart', (event) => handleQueueDragStart(event, item.queueId));
        row.addEventListener('dragover', handleQueueDragOver);
        row.addEventListener('drop', (event) => handleQueueDrop(event, item.queueId, elements));
        row.addEventListener('dragend', handleQueueDragEnd);

        elements.queueList.append(row);
    });
}

function moveQueueItem(index, direction, elements) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= pdfState.queue.length) {
        return;
    }

    const [item] = pdfState.queue.splice(index, 1);
    pdfState.queue.splice(targetIndex, 0, item);
    renderQueue(elements);
}

function handleQueueDragStart(event, queueId) {
    pdfState.draggedQueueId = queueId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', queueId);
    event.currentTarget.classList.add('is-dragging');
}

function handleQueueDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleQueueDrop(event, targetQueueId, elements) {
    event.preventDefault();

    const draggedQueueId = pdfState.draggedQueueId || event.dataTransfer.getData('text/plain');
    if (!draggedQueueId || draggedQueueId === targetQueueId) {
        return;
    }

    const draggedIndex = pdfState.queue.findIndex((item) => item.queueId === draggedQueueId);
    const targetIndex = pdfState.queue.findIndex((item) => item.queueId === targetQueueId);

    if (draggedIndex === -1 || targetIndex === -1) {
        return;
    }

    const [item] = pdfState.queue.splice(draggedIndex, 1);
    const insertionIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    pdfState.queue.splice(insertionIndex, 0, item);
    renderQueue(elements);
}

function handleQueueDragEnd(event) {
    pdfState.draggedQueueId = null;
    event.currentTarget.classList.remove('is-dragging');
}

async function handleExport(elements) {
    if (pdfState.queue.length === 0) {
        renderFeedback(elements.root, 'Add at least one page to the merge queue before exporting.', true);
        return;
    }

    try {
        const { PDFDocument } = window.PDFLib;
        const mergedPdf = await PDFDocument.create();
        const sourceCache = new Map();

        for (const item of pdfState.queue) {
            if (!sourceCache.has(item.uploadId)) {
                const upload = getUpload(item.uploadId);
                if (!upload) {
                    throw new Error(`Source PDF ${item.uploadName} is no longer available.`);
                }

                sourceCache.set(item.uploadId, await PDFDocument.load(upload.bytes));
            }

            const sourcePdf = sourceCache.get(item.uploadId);
            const [page] = await mergedPdf.copyPages(sourcePdf, [item.pageNumber - 1]);
            mergedPdf.addPage(page);
        }

        const mergedBytes = await mergedPdf.save();
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        const outputName = sanitizeOutputName(elements.outputName.value);

        pdfState.exportDownloadUrl = downloadUrl;

        elements.exportResult.hidden = false;
        elements.exportResult.innerHTML = `
            <span>Export ready: ${escapeHtml(outputName)}</span>
            <a class="text-link" href="${downloadUrl}" download="${escapeHtml(outputName)}">Download PDF</a>
        `;

        renderFeedback(elements.root, 'Final PDF built locally in the browser.');
    } catch (error) {
        renderFeedback(elements.root, error.message || 'Could not build the final PDF.', true);
    }
}

function removeUpload(uploadId, elements) {
    const uploadIndex = pdfState.uploads.findIndex((item) => item.id === uploadId);
    if (uploadIndex === -1) {
        return;
    }

    const [removed] = pdfState.uploads.splice(uploadIndex, 1);
    URL.revokeObjectURL(removed.objectUrl);
    pdfState.queue = pdfState.queue.filter((item) => item.uploadId !== uploadId);

    if (pdfState.activeUploadId === uploadId) {
        resetPageBrowser(elements);
    }

    renderUploads(elements);
    renderQueue(elements);
    renderFeedback(elements.root, 'Loaded PDF removed. Any queued pages from it were removed as well.');
}

function resetWorkspace(elements) {
    pdfState.uploads.forEach((upload) => URL.revokeObjectURL(upload.objectUrl));
    pdfState.uploads = [];
    pdfState.queue = [];
    pdfState.activeUploadId = null;
    pdfState.draggedQueueId = null;

    if (pdfState.exportDownloadUrl) {
        URL.revokeObjectURL(pdfState.exportDownloadUrl);
        pdfState.exportDownloadUrl = null;
    }

    elements.uploadForm.reset();
    resetPageBrowser(elements);
    renderUploads(elements);
    renderQueue(elements);
    renderFeedback(elements.root, 'Workspace cleared. No files were saved on the server.');
}

function resetPageBrowser(elements) {
    pdfState.activeUploadId = null;
    elements.activeUploadLabel.textContent = 'Preview one PDF at a time';
    elements.rangeBuilder.hidden = true;
    elements.pageBrowser.hidden = true;
    elements.pageBrowserEmpty.hidden = false;
    elements.pageBrowserEmpty.textContent = 'Select a loaded PDF to inspect its pages.';
    elements.pageBrowser.innerHTML = '';
}

function parsePageRange(input, maxPage) {
    const trimmed = input.trim();
    if (trimmed === '') {
        throw new Error('Enter a page range before adding it to the queue.');
    }

    const pages = [];
    const segments = trimmed.split(',');

    for (const rawSegment of segments) {
        const segment = rawSegment.trim();
        if (segment === '') {
            continue;
        }

        if (segment.includes('-')) {
            const [startText, endText] = segment.split('-', 2).map((part) => part.trim());
            const start = Number.parseInt(startText, 10);
            const end = Number.parseInt(endText, 10);

            if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > maxPage) {
                throw new Error(`Invalid page range "${segment}".`);
            }

            for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
                pages.push(pageNumber);
            }
        } else {
            const pageNumber = Number.parseInt(segment, 10);

            if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > maxPage) {
                throw new Error(`Invalid page number "${segment}".`);
            }

            pages.push(pageNumber);
        }
    }

    if (pages.length === 0) {
        throw new Error('No valid pages were found in that range.');
    }

    return pages;
}

function getUpload(uploadId) {
    return pdfState.uploads.find((item) => item.id === uploadId) || null;
}

function renderFeedback(root, message, isError = false) {
    const feedback = root.querySelector('[data-feedback]');
    feedback.hidden = false;
    feedback.textContent = message;
    feedback.style.background = isError ? '#f8ead8' : '#dceee8';
    feedback.style.color = isError ? '#8a4b12' : '#1d5c4d';
}

function formatBytes(bytes) {
    if (!bytes) {
        return '0 KB';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function sanitizeOutputName(value) {
    const trimmed = value.trim();
    const safe = (trimmed === '' ? 'falcon-merged.pdf' : trimmed).replace(/[^A-Za-z0-9._-]+/g, '-');

    return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
