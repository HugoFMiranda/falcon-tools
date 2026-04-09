import {
    buildPdfFromSequence,
    clearFeedback,
    createUploadRecord,
    ensurePagePreviews,
    escapeHtml,
    formatBytes,
    renderFeedback,
} from './pdf-shared.js';

const state = {
    uploads: [],
    pageSequence: [],
    draggedPageId: null,
    draggedUploadId: null,
    exportUrl: null,
};

document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-pdf-tool="reorder"]');
    if (!root || !window.PDFLib) {
        return;
    }

    const elements = {
        uploadInput: root.querySelector('[data-upload-input]'),
        uploadCount: root.querySelector('[data-upload-count]'),
        uploadList: root.querySelector('[data-upload-list]'),
        feedback: root.querySelector('[data-feedback]'),
        sequenceCount: root.querySelector('[data-sequence-count]'),
        outputName: root.querySelector('[data-output-name]'),
        exportButton: root.querySelector('[data-export-button]'),
        exportResult: root.querySelector('[data-export-result]'),
        canvasEmpty: root.querySelector('[data-canvas-empty]'),
        reorderCanvas: root.querySelector('[data-reorder-canvas]'),
        resetButton: root.querySelector('[data-reset-workspace]'),
    };

    elements.uploadInput.addEventListener('change', () => loadFiles(elements));
    elements.exportButton.addEventListener('click', () => exportReordered(elements));
    elements.resetButton.addEventListener('click', () => resetWorkspace(elements));

    renderUploads(elements);
    renderCanvas(elements);
});

async function loadFiles(elements) {
    const files = Array.from(elements.uploadInput.files || []);
    if (files.length === 0) {
        return;
    }

    try {
        for (const file of files) {
            const upload = await createUploadRecord(file);
            state.uploads.push(upload);
            await appendUploadPages(upload);
        }

        elements.uploadInput.value = '';
        clearFeedback(elements.feedback);
        renderUploads(elements);
        renderCanvas(elements);
    } catch (error) {
        renderFeedback(elements.feedback, error.message || 'Could not load the selected PDF files.', true);
    }
}

function renderUploads(elements) {
    elements.uploadCount.textContent = `${state.uploads.length} loaded`;

    if (state.uploads.length === 0) {
        elements.uploadList.innerHTML = '';
        return;
    }

    elements.uploadList.innerHTML = '';

    state.uploads.forEach((upload) => {
        const card = document.createElement('article');
        card.className = 'upload-item upload-item-preview';
        card.draggable = true;
        card.dataset.uploadId = upload.id;
        card.innerHTML = `
            <img src="${upload.coverPreview}" alt="Preview of ${escapeHtml(upload.name)}">
            <div class="upload-item-body">
                <div class="upload-title">${escapeHtml(upload.name)}</div>
                <div class="upload-meta">${formatBytes(upload.size)} | ${upload.pageCount} pages</div>
            </div>
            <div class="upload-actions">
                <button class="button button-secondary" type="button" data-action="remove">Remove</button>
            </div>
        `;

        card.querySelector('[data-action="remove"]').addEventListener('click', () => removeUpload(upload.id, elements));
        card.addEventListener('dragstart', (event) => handleUploadDragStart(event, upload.id));
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', (event) => handleUploadDrop(event, upload.id, elements));
        card.addEventListener('dragend', () => {
            state.draggedUploadId = null;
        });
        elements.uploadList.append(card);
    });
}

function renderCanvas(elements) {
    elements.sequenceCount.textContent = `${state.pageSequence.length} pages`;

    if (state.exportUrl) {
        URL.revokeObjectURL(state.exportUrl);
        state.exportUrl = null;
    }

    elements.exportResult.hidden = true;
    elements.exportResult.innerHTML = '';

    if (state.pageSequence.length === 0) {
        elements.reorderCanvas.hidden = true;
        elements.canvasEmpty.hidden = false;
        return;
    }

    elements.reorderCanvas.hidden = false;
    elements.canvasEmpty.hidden = true;
    elements.reorderCanvas.innerHTML = '';

    state.pageSequence.forEach((item, index) => {
        const article = document.createElement('article');
        article.className = 'reorder-tile';
        article.draggable = true;
        article.dataset.pageId = item.id;
        article.innerHTML = `
            <img src="${item.preview}" alt="Preview of page ${item.pageNumber} from ${escapeHtml(item.uploadName)}">
            <div class="reorder-tile-body">
                <div class="upload-title">${index + 1}. ${escapeHtml(item.uploadName)}</div>
                <div class="page-card-meta">Page ${item.pageNumber}</div>
            </div>
        `;

        article.addEventListener('dragstart', (event) => handlePageDragStart(event, item.id));
        article.addEventListener('dragover', handleDragOver);
        article.addEventListener('drop', (event) => handlePageDrop(event, item.id, elements));
        article.addEventListener('dragend', () => {
            state.draggedPageId = null;
        });
        elements.reorderCanvas.append(article);
    });
}

async function appendUploadPages(upload) {
    const pages = await ensurePagePreviews(upload, 0.26);

    pages.forEach((page) => {
        state.pageSequence.push({
            id: `${upload.id}:${page.pageNumber}`,
            uploadId: upload.id,
            uploadName: upload.name,
            pageNumber: page.pageNumber,
            preview: page.preview,
        });
    });
}

function handlePageDragStart(event, pageId) {
    state.draggedPageId = pageId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pageId);
}

function handleUploadDragStart(event, uploadId) {
    state.draggedUploadId = uploadId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', uploadId);
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handlePageDrop(event, targetPageId, elements) {
    event.preventDefault();
    const draggedPageId = state.draggedPageId || event.dataTransfer.getData('text/plain');
    if (!draggedPageId || draggedPageId === targetPageId) {
        return;
    }

    const fromIndex = state.pageSequence.findIndex((item) => item.id === draggedPageId);
    const toIndex = state.pageSequence.findIndex((item) => item.id === targetPageId);

    if (fromIndex === -1 || toIndex === -1) {
        return;
    }

    const [item] = state.pageSequence.splice(fromIndex, 1);
    const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    state.pageSequence.splice(insertIndex, 0, item);
    renderCanvas(elements);
}

function handleUploadDrop(event, targetUploadId, elements) {
    event.preventDefault();
    const draggedUploadId = state.draggedUploadId || event.dataTransfer.getData('text/plain');
    if (!draggedUploadId || draggedUploadId === targetUploadId) {
        return;
    }

    const sourcePages = state.pageSequence.filter((item) => item.uploadId === draggedUploadId);
    const remaining = state.pageSequence.filter((item) => item.uploadId !== draggedUploadId);
    const targetIndex = remaining.findIndex((item) => item.uploadId === targetUploadId);

    if (sourcePages.length === 0 || targetIndex === -1) {
        return;
    }

    remaining.splice(targetIndex, 0, ...sourcePages);
    state.pageSequence = remaining;

    const draggedUploadIndex = state.uploads.findIndex((item) => item.id === draggedUploadId);
    const targetUploadIndex = state.uploads.findIndex((item) => item.id === targetUploadId);
    if (draggedUploadIndex !== -1 && targetUploadIndex !== -1) {
        const [upload] = state.uploads.splice(draggedUploadIndex, 1);
        const insertIndex = draggedUploadIndex < targetUploadIndex ? targetUploadIndex - 1 : targetUploadIndex;
        state.uploads.splice(insertIndex, 0, upload);
    }

    renderUploads(elements);
    renderCanvas(elements);
}

function removeUpload(uploadId, elements) {
    state.uploads = state.uploads.filter((upload) => upload.id !== uploadId);
    state.pageSequence = state.pageSequence.filter((item) => item.uploadId !== uploadId);
    renderUploads(elements);
    renderCanvas(elements);
}

async function exportReordered(elements) {
    if (state.pageSequence.length === 0) {
        renderFeedback(elements.feedback, 'Load at least one PDF before exporting.', true);
        return;
    }

    const uploadsById = new Map(state.uploads.map((upload) => [upload.id, upload]));
    const result = await buildPdfFromSequence(state.pageSequence, uploadsById, elements.outputName.value || 'falcon-reordered.pdf');
    state.exportUrl = result.url;
    elements.exportResult.hidden = false;
    elements.exportResult.innerHTML = `
        <span>${result.pageCount} pages ready</span>
        <a class="text-link" href="${result.url}" download="${escapeHtml(result.filename)}">Download PDF</a>
    `;
    renderFeedback(elements.feedback, 'PDF ready.');
}

function resetWorkspace(elements) {
    if (state.exportUrl) {
        URL.revokeObjectURL(state.exportUrl);
    }

    state.uploads = [];
    state.pageSequence = [];
    state.draggedPageId = null;
    state.draggedUploadId = null;
    state.exportUrl = null;
    elements.uploadInput.value = '';
    clearFeedback(elements.feedback);
    renderUploads(elements);
    renderCanvas(elements);
}
