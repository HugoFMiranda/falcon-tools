import * as pdfjsLib from '../vendor/pdfjs/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).toString();

const STORAGE_KEY = 'falcon-tools-pdf-workspace-v1';

const pdfState = {
    uploads: [],
    queue: [],
    activeUploadId: null,
    activeMode: 'merge',
    draggedQueueId: null,
    exportDownloadUrl: null,
    serverProcessor: {
        available: false,
        engine: 'browser-fallback',
    },
    duplicateKeys: new Set(),
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
        exportMode: root.querySelector('[data-export-mode]'),
        exportModeNote: root.querySelector('[data-export-mode-note]'),
        removeDuplicates: root.querySelector('[data-remove-duplicates]'),
        groupDuplicates: root.querySelector('[data-group-duplicates]'),
        modeCards: Array.from(root.querySelectorAll('[data-tool-mode]')),
        modeTitle: root.querySelector('[data-mode-title]'),
        modeCopy: root.querySelector('[data-mode-copy]'),
        resetWorkspace: root.querySelector('[data-reset-workspace]'),
        activeUploadLabel: root.querySelector('[data-active-upload-label]'),
        rangeBuilder: root.querySelector('[data-range-builder]'),
        rangeInput: root.querySelector('[data-range-input]'),
        addRangeButton: root.querySelector('[data-add-range]'),
    };

    elements.uploadForm.addEventListener('submit', (event) => handleLocalFiles(event, elements));
    elements.exportButton.addEventListener('click', () => handleExport(elements));
    elements.resetWorkspace.addEventListener('click', () => resetWorkspace(elements));
    elements.addRangeButton.addEventListener('click', () => addRangeFromActiveUpload(elements));
    elements.exportMode.addEventListener('change', () => {
        updateExportModeNote(elements);
        persistWorkspace(elements);
    });
    elements.removeDuplicates.addEventListener('click', () => removeDuplicateQueueEntries(elements));
    elements.groupDuplicates.addEventListener('click', () => highlightDuplicateQueueEntries(elements));
    elements.outputName.addEventListener('input', () => persistWorkspace(elements));
    elements.modeCards.forEach((card) => {
        card.addEventListener('click', () => setActiveMode(card.dataset.toolMode || 'merge', elements));
    });

    bootstrapWorkspace(elements);
});

async function bootstrapWorkspace(elements) {
    pdfState.activeMode = window.FALCON_TOOLS.defaultMode || 'merge';
    await loadServerProcessorState(elements);
    restoreWorkspace(elements);
    updateExportModeNote(elements);
    updateModeUI(elements);
    renderUploads(elements);
    renderQueue(elements);
}

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
        persistWorkspace(elements);
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
                <button class="button button-secondary" type="button" data-action="add-all">Add all</button>
                <button class="button button-secondary" type="button" data-action="browse">Browse pages</button>
                <button class="button button-secondary" type="button" data-action="remove">Remove</button>
            </div>
        `;

        card.querySelector('[data-action="add-all"]').addEventListener('click', () => addAllPages(upload, elements));
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
        persistWorkspace(elements);
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
        persistWorkspace(elements);
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
        rotation: 0,
    });
}

function addAllPages(upload, elements) {
    for (let pageNumber = 1; pageNumber <= upload.pageCount; pageNumber += 1) {
        addQueueItem(upload, pageNumber);
    }

    persistWorkspace(elements);
    renderQueue(elements);
    renderFeedback(elements.root, `Added all ${upload.pageCount} pages from ${upload.originalName}.`);
}

function renderQueue(elements) {
    pdfState.duplicateKeys = findDuplicateKeys(pdfState.queue);
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
        if (pdfState.duplicateKeys.has(queueDuplicateKey(item))) {
            row.classList.add('is-duplicate');
        }
        row.draggable = true;
        row.dataset.queueId = item.queueId;
        row.innerHTML = `
            <div>
                <div class="queue-title">${index + 1}. ${escapeHtml(item.uploadName)}</div>
                <div class="queue-meta">Page ${item.pageNumber} | Rotation ${item.rotation || 0} deg | Drag to reorder</div>
            </div>
            <div class="queue-item-actions">
                <button class="button button-secondary" type="button" data-action="rotate-left">Rotate -90</button>
                <button class="button button-secondary" type="button" data-action="rotate-right">Rotate +90</button>
                <button class="button button-secondary" type="button" data-action="up">Up</button>
                <button class="button button-secondary" type="button" data-action="down">Down</button>
                <button class="button button-secondary" type="button" data-action="remove">Remove</button>
            </div>
        `;

        row.querySelector('[data-action="rotate-left"]').addEventListener('click', () => rotateQueueItem(index, -90, elements));
        row.querySelector('[data-action="rotate-right"]').addEventListener('click', () => rotateQueueItem(index, 90, elements));
        row.querySelector('[data-action="up"]').addEventListener('click', () => moveQueueItem(index, -1, elements));
        row.querySelector('[data-action="down"]').addEventListener('click', () => moveQueueItem(index, 1, elements));
        row.querySelector('[data-action="remove"]').addEventListener('click', () => {
            pdfState.queue.splice(index, 1);
            persistWorkspace(elements);
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
    persistWorkspace(elements);
    renderQueue(elements);
}

function rotateQueueItem(index, delta, elements) {
    const item = pdfState.queue[index];
    if (!item) {
        return;
    }

    item.rotation = normalizeRotation((item.rotation || 0) + delta);
    persistWorkspace(elements);
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
    persistWorkspace(elements);
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
        if (elements.exportMode.value === 'server') {
            await handleServerExport(elements);
            return;
        }

        const { PDFDocument, degrees } = window.PDFLib;
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
            page.setRotation(degrees(item.rotation || 0));
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

async function handleServerExport(elements) {
    if (!pdfState.serverProcessor.available) {
        throw new Error('Server export is not available because qpdf was not detected on the server.');
    }

    if (pdfState.queue.some((item) => normalizeRotation(item.rotation || 0) !== 0)) {
        throw new Error('Server export does not support rotated pages yet. Use browser mode for rotated output.');
    }

    const uploadResponse = await uploadWorkspaceToServer();
    const queue = buildServerQueue(uploadResponse.uploadMap);
    const exportPayload = {
        queue,
        outputName: sanitizeOutputName(elements.outputName.value),
    };

    try {
        const response = await fetch(window.FALCON_TOOLS.endpoints.export, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(exportPayload),
            credentials: 'same-origin',
        });
        const payload = await response.json();

        if (!payload.success) {
            throw new Error(payload.error || 'Server export failed.');
        }

        const fileResponse = await fetch(payload.data.output.download_url, {
            credentials: 'same-origin',
        });
        if (!fileResponse.ok) {
            throw new Error('Could not download the server-generated PDF.');
        }

        const blob = await fileResponse.blob();
        const downloadUrl = URL.createObjectURL(blob);
        pdfState.exportDownloadUrl = downloadUrl;

        elements.exportResult.hidden = false;
        elements.exportResult.innerHTML = `
            <span>Server export ready: ${escapeHtml(payload.data.output.filename)}</span>
            <a class="text-link" href="${downloadUrl}" download="${escapeHtml(payload.data.output.filename)}">Download PDF</a>
        `;

        renderFeedback(elements.root, 'Final PDF was assembled on the server and downloaded back to the browser.');
    } finally {
        await cleanupServerWorkspace();
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
    persistWorkspace(elements);
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
    persistWorkspace(elements);
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

async function loadServerProcessorState(elements) {
    try {
        const response = await fetch(window.FALCON_TOOLS.endpoints.state, {
            credentials: 'same-origin',
        });
        const payload = await response.json();

        if (payload.success && payload.data && payload.data.processor) {
            pdfState.serverProcessor = payload.data.processor;
        }
    } catch {
        pdfState.serverProcessor = {
            available: false,
            engine: 'browser-fallback',
        };
    }

    elements.engineLabel.textContent = pdfState.serverProcessor.available
        ? 'Browser-first workspace | optional qpdf server export available'
        : 'Browser-first workspace | server export unavailable in this environment';
}

function updateExportModeNote(elements) {
    const serverOption = elements.exportMode.querySelector('option[value="server"]');
    serverOption.disabled = !pdfState.serverProcessor.available;

    if (elements.exportMode.value === 'server' && !pdfState.serverProcessor.available) {
        elements.exportMode.value = 'browser';
    }

    elements.exportModeNote.textContent = elements.exportMode.value === 'server'
        ? 'Server mode uploads the current PDFs only for export, assembles with qpdf, then cleans the server workspace.'
        : 'Browser mode keeps PDFs in this tab and avoids uploading source files.';
}

function setActiveMode(mode, elements) {
    pdfState.activeMode = mode;
    updateModeUI(elements);
    persistWorkspace(elements);
}

function updateModeUI(elements) {
    const modeContent = {
        merge: {
            title: 'Merge PDFs',
            copy: 'Append full documents fast or pick specific pages when you need a custom order.',
        },
        reorder: {
            title: 'Reorder PDF',
            copy: 'Load a PDF, add its pages, drag them into a new order, and download the result.',
        },
        mix: {
            title: 'Custom Mix',
            copy: 'Combine ranges and individual pages from multiple PDFs in any order you want.',
        },
    };

    const current = modeContent[pdfState.activeMode] || modeContent.merge;
    elements.modeTitle.textContent = current.title;
    elements.modeCopy.textContent = current.copy;

    elements.modeCards.forEach((card) => {
        card.classList.toggle('is-active', card.dataset.toolMode === pdfState.activeMode);
    });
}

async function uploadWorkspaceToServer() {
    const formData = new FormData();
    const localIds = [];

    pdfState.uploads.forEach((upload) => {
        formData.append('pdf_files[]', upload.file, upload.originalName);
        localIds.push(upload.id);
    });

    const response = await fetch(window.FALCON_TOOLS.endpoints.upload, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
    });
    const payload = await response.json();

    if (!payload.success) {
        throw new Error(payload.error || 'Could not upload PDFs for server export.');
    }

    const serverUploads = payload.data.uploads || [];
    if (serverUploads.length !== localIds.length) {
        throw new Error('Server export upload did not return the expected number of PDFs.');
    }

    const uploadMap = new Map();
    localIds.forEach((localId, index) => {
        uploadMap.set(localId, serverUploads[index].id);
    });

    return { uploadMap };
}

function buildServerQueue(uploadMap) {
    return pdfState.queue.map((item) => {
        const uploadId = uploadMap.get(item.uploadId);
        if (!uploadId) {
            throw new Error(`Server export could not match the file ${item.uploadName}.`);
        }

        return {
            queueId: item.queueId,
            uploadId,
            pageNumber: item.pageNumber,
        };
    });
}

async function cleanupServerWorkspace() {
    try {
        await fetch(window.FALCON_TOOLS.endpoints.cleanup, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reset: true }),
            credentials: 'same-origin',
        });
    } catch {
        // Ignore cleanup failures. Automatic cleanup remains in place.
    }
}

function removeDuplicateQueueEntries(elements) {
    const seen = new Set();
    const before = pdfState.queue.length;

    pdfState.queue = pdfState.queue.filter((item) => {
        const key = queueDuplicateKey(item);
        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });

    persistWorkspace(elements);
    renderQueue(elements);

    const removedCount = before - pdfState.queue.length;
    renderFeedback(
        elements.root,
        removedCount === 0
            ? 'No duplicate queue entries were found.'
            : `Removed ${removedCount} duplicate queue entr${removedCount === 1 ? 'y' : 'ies'}.`
    );
}

function highlightDuplicateQueueEntries(elements) {
    renderQueue(elements);

    if (pdfState.duplicateKeys.size === 0) {
        renderFeedback(elements.root, 'No duplicate queue entries were found.');
        return;
    }

    renderFeedback(
        elements.root,
        `Highlighted ${pdfState.duplicateKeys.size} duplicate page selection${pdfState.duplicateKeys.size === 1 ? '' : 's'} in the queue.`
    );
}

function restoreWorkspace(elements) {
    const raw = safeLocalStorageGet(STORAGE_KEY);
    if (!raw) {
        return;
    }

    try {
        const snapshot = JSON.parse(raw);

        if (typeof snapshot.outputName === 'string' && snapshot.outputName !== '') {
            elements.outputName.value = snapshot.outputName;
        }

        if (typeof snapshot.exportMode === 'string') {
            elements.exportMode.value = snapshot.exportMode;
        }

        if (!window.FALCON_TOOLS.defaultMode && typeof snapshot.activeMode === 'string') {
            pdfState.activeMode = snapshot.activeMode;
        }

        if (Array.isArray(snapshot.queue)) {
            pdfState.queue = snapshot.queue.map((item) => ({
                queueId: typeof item.queueId === 'string' ? item.queueId : makeId('queue'),
                uploadId: String(item.uploadId || ''),
                uploadName: String(item.uploadName || ''),
                pageNumber: Number(item.pageNumber || 0),
                rotation: normalizeRotation(Number(item.rotation || 0)),
            })).filter((item) => item.uploadId !== '' && item.pageNumber > 0);
        }
    } catch {
        safeLocalStorageRemove(STORAGE_KEY);
    }
}

function persistWorkspace(elements) {
    const snapshot = {
        outputName: elements.outputName.value || 'falcon-merged.pdf',
        exportMode: elements.exportMode.value,
        activeMode: pdfState.activeMode,
        queue: pdfState.queue.map((item) => ({
            queueId: item.queueId,
            uploadId: item.uploadId,
            uploadName: item.uploadName,
            pageNumber: item.pageNumber,
            rotation: normalizeRotation(item.rotation || 0),
        })),
    };

    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(snapshot));
}

function findDuplicateKeys(queue) {
    const counts = new Map();

    queue.forEach((item) => {
        const key = queueDuplicateKey(item);
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    const duplicates = new Set();
    counts.forEach((count, key) => {
        if (count > 1) {
            duplicates.add(key);
        }
    });

    return duplicates;
}

function queueDuplicateKey(item) {
    return `${item.uploadId}:${item.pageNumber}:${normalizeRotation(item.rotation || 0)}`;
}

function normalizeRotation(value) {
    const normalized = value % 360;

    return normalized < 0 ? normalized + 360 : normalized;
}

function safeLocalStorageGet(key) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeLocalStorageSet(key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Ignore storage failures.
    }
}

function safeLocalStorageRemove(key) {
    try {
        window.localStorage.removeItem(key);
    } catch {
        // Ignore storage failures.
    }
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
