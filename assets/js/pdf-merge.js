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
    selectedPages: new Set(),
    exportUrl: null,
};

document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-pdf-tool="merge"]');
    if (!root || !window.PDFLib) {
        return;
    }

    const elements = {
        uploadInput: root.querySelector('[data-upload-input]'),
        uploadCount: root.querySelector('[data-upload-count]'),
        uploadList: root.querySelector('[data-upload-list]'),
        feedback: root.querySelector('[data-feedback]'),
        selectionCount: root.querySelector('[data-selection-count]'),
        outputName: root.querySelector('[data-output-name]'),
        exportButtons: Array.from(root.querySelectorAll('[data-export-button]')),
        exportResult: root.querySelector('[data-export-result]'),
        groupsEmpty: root.querySelector('[data-page-browser-empty]'),
        groups: root.querySelector('[data-page-groups]'),
    };

    elements.uploadInput.addEventListener('change', () => loadFiles(elements));
    elements.exportButtons.forEach((button) => button.addEventListener('click', () => exportMerge(elements)));

    renderUploads(elements);
    renderSelectionGroups(elements);
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
            for (let pageNumber = 1; pageNumber <= upload.pageCount; pageNumber += 1) {
                state.selectedPages.add(pageKey(upload.id, pageNumber));
            }
        }

        elements.uploadInput.value = '';
        clearFeedback(elements.feedback);
        renderUploads(elements);
        await renderSelectionGroups(elements);
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
        card.innerHTML = `
            <img src="${upload.coverPreview}" alt="Preview of ${escapeHtml(upload.name)}">
            <div class="upload-item-body">
                <div class="upload-title">${escapeHtml(upload.name)}</div>
                <div class="upload-meta">${formatBytes(upload.size)} | ${upload.pageCount} pages</div>
            </div>
            <div class="upload-actions">
                <button class="button button-secondary" type="button" data-action="toggle-all">Select all</button>
                <button class="button button-secondary" type="button" data-action="remove">Remove</button>
            </div>
        `;

        card.querySelector('[data-action="toggle-all"]').addEventListener('click', () => toggleAll(upload, elements));
        card.querySelector('[data-action="remove"]').addEventListener('click', () => removeUpload(upload.id, elements));
        elements.uploadList.append(card);
    });
}

async function renderSelectionGroups(elements) {
    elements.selectionCount.textContent = `${state.selectedPages.size} selected`;

    if (state.exportUrl) {
        URL.revokeObjectURL(state.exportUrl);
        state.exportUrl = null;
    }

    elements.exportResult.hidden = true;
    elements.exportResult.innerHTML = '';

    if (state.uploads.length === 0) {
        elements.groups.hidden = true;
        elements.groupsEmpty.hidden = false;
        return;
    }

    elements.groups.hidden = false;
    elements.groupsEmpty.hidden = true;
    elements.groups.innerHTML = '';

    for (const upload of state.uploads) {
        const pages = await ensurePagePreviews(upload, 0.28);
        const section = document.createElement('section');
        section.className = 'pdf-group';
        section.innerHTML = `
            <div class="pdf-group-head">
                <div>
                    <h3>${escapeHtml(upload.name)}</h3>
                    <div class="mono-note">${upload.pageCount} pages</div>
                </div>
                <button class="button button-secondary" type="button" data-action="toggle-all">Select all</button>
            </div>
            <div class="page-grid"></div>
        `;

        section.querySelector('[data-action="toggle-all"]').addEventListener('click', () => toggleAll(upload, elements));
        const pageGrid = section.querySelector('.page-grid');

        pages.forEach((page) => {
            const key = pageKey(upload.id, page.pageNumber);
            const article = document.createElement('article');
            article.className = `page-tile${state.selectedPages.has(key) ? ' is-selected' : ''}`;
            article.innerHTML = `
                <button class="page-tile-hit" type="button">
                    <img src="${page.preview}" alt="Preview of page ${page.pageNumber} from ${escapeHtml(upload.name)}">
                    <span class="page-card-meta">Page ${page.pageNumber}</span>
                </button>
            `;

            article.querySelector('button').addEventListener('click', () => {
                togglePageSelection(upload.id, page.pageNumber);
                article.classList.toggle('is-selected', state.selectedPages.has(key));
                elements.selectionCount.textContent = `${state.selectedPages.size} selected`;
            });

            pageGrid.append(article);
        });

        elements.groups.append(section);
    }
}

function togglePageSelection(uploadId, pageNumber) {
    const key = pageKey(uploadId, pageNumber);

    if (state.selectedPages.has(key)) {
        state.selectedPages.delete(key);
    } else {
        state.selectedPages.add(key);
    }
}

function toggleAll(upload, elements) {
    const keys = [];

    for (let pageNumber = 1; pageNumber <= upload.pageCount; pageNumber += 1) {
        keys.push(pageKey(upload.id, pageNumber));
    }

    const allSelected = keys.every((key) => state.selectedPages.has(key));
    keys.forEach((key) => {
        if (allSelected) {
            state.selectedPages.delete(key);
        } else {
            state.selectedPages.add(key);
        }
    });

    renderSelectionGroups(elements);
}

function removeUpload(uploadId, elements) {
    state.uploads = state.uploads.filter((upload) => upload.id !== uploadId);

    Array.from(state.selectedPages).forEach((key) => {
        if (key.startsWith(`${uploadId}:`)) {
            state.selectedPages.delete(key);
        }
    });

    renderUploads(elements);
    renderSelectionGroups(elements);
}

async function exportMerge(elements) {
    const sequence = [];
    const uploadsById = new Map(state.uploads.map((upload) => [upload.id, upload]));

    state.uploads.forEach((upload) => {
        for (let pageNumber = 1; pageNumber <= upload.pageCount; pageNumber += 1) {
            if (state.selectedPages.has(pageKey(upload.id, pageNumber))) {
                sequence.push({
                    uploadId: upload.id,
                    uploadName: upload.name,
                    pageNumber,
                });
            }
        }
    });

    if (sequence.length === 0) {
        renderFeedback(elements.feedback, 'Select at least one page before exporting.', true);
        return;
    }

    const result = await buildPdfFromSequence(sequence, uploadsById, elements.outputName.value || 'falcon-merged.pdf');
    state.exportUrl = result.url;
    triggerDownload(result.url, result.filename);
    elements.exportResult.hidden = false;
    elements.exportResult.innerHTML = `<span>${result.pageCount} pages downloaded</span>`;
    renderFeedback(elements.feedback, 'PDF ready.');
}

function resetWorkspace(elements) {
    if (state.exportUrl) {
        URL.revokeObjectURL(state.exportUrl);
    }

    state.uploads = [];
    state.selectedPages.clear();
    state.exportUrl = null;
    elements.uploadInput.value = '';
    clearFeedback(elements.feedback);
    renderUploads(elements);
    renderSelectionGroups(elements);
}

function pageKey(uploadId, pageNumber) {
    return `${uploadId}:${pageNumber}`;
}

function triggerDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
}
