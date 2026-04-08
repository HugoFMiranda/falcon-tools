const pdfState = {
    uploads: [],
    queue: [],
    loadedPages: new Map(),
    processor: null,
    activeUploadId: null,
};

document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-pdf-tool]');

    if (!root) {
        return;
    }

    const waitForLibraries = window.setInterval(() => {
        if (!window.pdfjsLib || !window.PDFLib) {
            return;
        }

        window.clearInterval(waitForLibraries);
        bootPdfTool(root);
    }, 100);

    window.setTimeout(() => {
        if (!window.pdfjsLib || !window.PDFLib) {
            window.clearInterval(waitForLibraries);
            renderFeedback(root, 'PDF.js or PDF-Lib could not be loaded. Check your network access or host those files locally.', true);
        }
    }, 5000);
});

function bootPdfTool(root) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = window.FALCON_TOOLS.pdfJsWorker;

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
    };

    elements.uploadForm.addEventListener('submit', (event) => handleUpload(event, elements));
    elements.exportButton.addEventListener('click', () => handleExport(elements));
    elements.resetWorkspace.addEventListener('click', () => resetWorkspace(elements));

    hydrateWorkspace(elements);
}

async function hydrateWorkspace(elements) {
    try {
        const response = await fetch(window.FALCON_TOOLS.endpoints.state);
        const payload = await response.json();

        if (!payload.success) {
            throw new Error(payload.error || 'Could not load the PDF workspace.');
        }

        pdfState.uploads = payload.data.uploads || [];
        pdfState.processor = payload.data.processor || null;

        if (pdfState.processor) {
            elements.engineLabel.textContent = `${pdfState.processor.engine} | ${pdfState.processor.notes}`;
        }

        renderUploads(elements);
        renderQueue(elements);
    } catch (error) {
        renderFeedback(elements.root, error.message, true);
    }
}

async function handleUpload(event, elements) {
    event.preventDefault();

    const input = elements.uploadForm.querySelector('input[type="file"]');
    const files = input.files;

    if (!files || files.length === 0) {
        renderFeedback(elements.root, 'Select at least one PDF file before uploading.', true);
        return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('pdf_files[]', file));

    try {
        const response = await fetch(window.FALCON_TOOLS.endpoints.upload, {
            method: 'POST',
            body: formData,
        });
        const payload = await response.json();

        if (!payload.success) {
            throw new Error(payload.error || 'Upload failed.');
        }

        pdfState.uploads = payload.data.uploads || [];
        pdfState.loadedPages.clear();
        input.value = '';
        renderUploads(elements);
        renderFeedback(elements.root, payload.data.message || 'PDF upload complete.');
    } catch (error) {
        renderFeedback(elements.root, error.message, true);
    }
}

function renderUploads(elements) {
    elements.uploadCount.textContent = `${pdfState.uploads.length} file${pdfState.uploads.length === 1 ? '' : 's'}`;

    if (pdfState.uploads.length === 0) {
        elements.uploadList.innerHTML = '<div class="queue-empty">No PDFs uploaded yet.</div>';
        elements.pageBrowser.hidden = true;
        elements.pageBrowserEmpty.hidden = false;
        elements.pageBrowserEmpty.textContent = 'Select an uploaded PDF to inspect its pages.';
        return;
    }

    elements.uploadList.innerHTML = '';

    pdfState.uploads.forEach((upload) => {
        const card = document.createElement('article');
        card.className = 'upload-item';
        const pageLabel = Number.isInteger(upload.page_count) ? ` | ${upload.page_count} pages` : '';
        card.innerHTML = `
            <div>
                <div class="upload-title">${escapeHtml(upload.original_name)}</div>
                <div class="upload-meta">${formatBytes(upload.size)}${pageLabel} | Uploaded ${formatDate(upload.uploaded_at)}</div>
            </div>
            <div class="upload-actions">
                <button class="button button-secondary" type="button" data-action="browse">Browse pages</button>
                <button class="button button-secondary" type="button" data-action="remove">Remove</button>
            </div>
        `;

        card.querySelector('[data-action="browse"]').addEventListener('click', () => loadUploadPages(upload, elements));
        card.querySelector('[data-action="remove"]').addEventListener('click', () => removeUpload(upload.id, elements));
        elements.uploadList.append(card);
    });
}

async function loadUploadPages(upload, elements) {
    pdfState.activeUploadId = upload.id;
    elements.pageBrowser.hidden = false;
    elements.pageBrowserEmpty.hidden = true;
    elements.pageBrowser.innerHTML = '<div class="queue-empty">Loading PDF pages...</div>';

    try {
        let cachedPages = pdfState.loadedPages.get(upload.id);

        if (!cachedPages) {
            // Cache rendered preview data per upload so browsing the same PDF stays responsive.
            const loadingTask = window.pdfjsLib.getDocument(upload.file_url);
            const pdfDocument = await loadingTask.promise;
            cachedPages = [];

            for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
                const page = await pdfDocument.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 0.35 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport }).promise;

                cachedPages.push({
                    pageNumber,
                    previewDataUrl: canvas.toDataURL('image/jpeg', 0.82),
                });
            }

            pdfState.loadedPages.set(upload.id, cachedPages);
        }

        elements.pageBrowser.innerHTML = '';

        cachedPages.forEach((page) => {
            const pageCard = document.createElement('article');
            pageCard.className = 'page-card';
            pageCard.innerHTML = `
                <img src="${page.previewDataUrl}" alt="Preview of page ${page.pageNumber} from ${escapeHtml(upload.original_name)}">
                <div class="page-card-meta">Page ${page.pageNumber}</div>
                <button class="button button-secondary" type="button">Add to queue</button>
            `;

            pageCard.querySelector('button').addEventListener('click', () => {
                pdfState.queue.push({
                    queueId: makeQueueId(),
                    uploadId: upload.id,
                    uploadName: upload.original_name,
                    pageNumber: page.pageNumber,
                });
                renderQueue(elements);
            });

            elements.pageBrowser.append(pageCard);
        });
    } catch (error) {
        elements.pageBrowser.innerHTML = `<div class="queue-empty">${escapeHtml(error.message || 'Could not load PDF pages.')}</div>`;
    }
}

function renderQueue(elements) {
    elements.queueCount.textContent = `${pdfState.queue.length} page${pdfState.queue.length === 1 ? '' : 's'} selected`;
    elements.queueEmpty.hidden = pdfState.queue.length > 0;
    elements.queueList.innerHTML = '';
    elements.exportResult.hidden = true;

    if (pdfState.queue.length === 0) {
        return;
    }

    pdfState.queue.forEach((item, index) => {
        const row = document.createElement('article');
        row.className = 'queue-item';
        row.innerHTML = `
            <div>
                <div class="queue-title">${index + 1}. ${escapeHtml(item.uploadName)}</div>
                <div class="queue-meta">Page ${item.pageNumber}</div>
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

async function handleExport(elements) {
    if (pdfState.queue.length === 0) {
        renderFeedback(elements.root, 'Add at least one page to the merge queue before exporting.', true);
        return;
    }

    try {
        const processResponse = await fetch(window.FALCON_TOOLS.endpoints.process, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ queue: pdfState.queue }),
        });
        const processPayload = await processResponse.json();

        if (!processPayload.success) {
            throw new Error(processPayload.error || 'Queue validation failed.');
        }

        const exportRequest = {
            queue: pdfState.queue,
            outputName: elements.outputName.value || 'falcon-merged.pdf',
        };

        if (!pdfState.processor || !pdfState.processor.available) {
            const mergedBytes = await buildMergedPdf();
            exportRequest.mergedDocumentBase64 = bytesToBase64(mergedBytes);
        }

        const exportResponse = await fetch(window.FALCON_TOOLS.endpoints.export, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(exportRequest),
        });
        const exportPayload = await exportResponse.json();

        if (!exportPayload.success) {
            throw new Error(exportPayload.error || 'Export failed.');
        }

        elements.exportResult.hidden = false;
        elements.exportResult.innerHTML = `
            <span>Export complete: ${escapeHtml(exportPayload.data.output.filename)}</span>
            <a class="text-link" href="${exportPayload.data.output.download_url}">Download PDF</a>
        `;
    } catch (error) {
        renderFeedback(elements.root, error.message, true);
    }
}

async function buildMergedPdf() {
    const { PDFDocument } = window.PDFLib;
    const mergedPdf = await PDFDocument.create();
    const sourceCache = new Map();

    // The browser assembles the final PDF for the MVP. The backend stores the result and
    // already exposes queue validation endpoints so qpdf can replace this step later.
    for (const item of pdfState.queue) {
        if (!sourceCache.has(item.uploadId)) {
            const upload = pdfState.uploads.find((entry) => entry.id === item.uploadId);
            if (!upload) {
                throw new Error(`Upload ${item.uploadId} is no longer available.`);
            }

            const sourceBytes = await fetch(upload.file_url).then((response) => response.arrayBuffer());
            sourceCache.set(item.uploadId, await PDFDocument.load(sourceBytes));
        }

        const sourcePdf = sourceCache.get(item.uploadId);
        const [page] = await mergedPdf.copyPages(sourcePdf, [item.pageNumber - 1]);
        mergedPdf.addPage(page);
    }

    return mergedPdf.save();
}

async function resetWorkspace(elements) {
    try {
        const response = await fetch(window.FALCON_TOOLS.endpoints.cleanup, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reset: true }),
        });
        const payload = await response.json();

        if (!payload.success) {
            throw new Error(payload.error || 'Could not reset the workspace.');
        }

        pdfState.uploads = [];
        pdfState.queue = [];
        pdfState.loadedPages.clear();
        pdfState.activeUploadId = null;
        renderUploads(elements);
        renderQueue(elements);
        renderFeedback(elements.root, 'Workspace cleared.');
    } catch (error) {
        renderFeedback(elements.root, error.message, true);
    }
}

async function removeUpload(uploadId, elements) {
    try {
        const response = await fetch(window.FALCON_TOOLS.endpoints.removeUpload, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uploadId }),
        });
        const payload = await response.json();

        if (!payload.success) {
            throw new Error(payload.error || 'Could not remove the uploaded PDF.');
        }

        pdfState.uploads = payload.data.uploads || [];
        pdfState.loadedPages.delete(uploadId);
        pdfState.queue = pdfState.queue.filter((item) => item.uploadId !== uploadId);

        if (pdfState.activeUploadId === uploadId || pdfState.uploads.length === 0) {
            pdfState.activeUploadId = null;
            elements.pageBrowser.hidden = true;
            elements.pageBrowserEmpty.hidden = false;
            elements.pageBrowserEmpty.textContent = 'Select an uploaded PDF to inspect its pages.';
        }

        renderUploads(elements);
        renderQueue(elements);
        renderFeedback(elements.root, 'Upload removed. Any queued pages from that PDF were also removed.');
    } catch (error) {
        renderFeedback(elements.root, error.message, true);
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

function formatDate(value) {
    return new Date(value).toLocaleString();
}

function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return window.btoa(binary);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function makeQueueId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }

    return `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
