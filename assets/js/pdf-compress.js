import {
    clearFeedback,
    compressPdfUpload,
    createUploadRecord,
    escapeHtml,
    formatBytes,
    renderFeedback,
    sanitizeOutputName,
} from './pdf-shared.js';

const COMPRESSION_LEVELS = {
    balanced: {
        quality: 0.78,
        renderScale: 1,
    },
    strong: {
        quality: 0.64,
        renderScale: 0.88,
    },
    maximum: {
        quality: 0.5,
        renderScale: 0.72,
    },
};

const state = {
    upload: null,
    level: 'balanced',
    exportUrl: null,
};

document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-pdf-tool="compress"]');
    if (!root || !window.PDFLib) {
        return;
    }

    const elements = {
        root,
        uploadInput: root.querySelector('[data-upload-input]'),
        uploadLaunch: root.querySelector('.upload-launch'),
        uploadCount: root.querySelector('[data-upload-count]'),
        uploadList: root.querySelector('[data-upload-list]'),
        feedback: root.querySelector('[data-feedback]'),
        resetButton: root.querySelector('[data-reset-button]'),
        sizeNote: root.querySelector('[data-file-size-note]'),
        compressEmpty: root.querySelector('[data-compress-empty]'),
        compressPanel: root.querySelector('[data-compress-panel]'),
        outputName: root.querySelector('[data-output-name]'),
        exportButton: root.querySelector('[data-export-button]'),
        exportResult: root.querySelector('[data-export-result]'),
        originalSize: root.querySelector('[data-original-size]'),
        pageCount: root.querySelector('[data-page-count]'),
        levelButtons: Array.from(root.querySelectorAll('[data-level]')),
    };

    elements.uploadInput.addEventListener('change', () => loadFile(elements));
    elements.resetButton.addEventListener('click', () => resetWorkspace(elements));
    elements.exportButton.addEventListener('click', () => exportCompressedPdf(elements));
    elements.levelButtons.forEach((button) => {
        button.addEventListener('click', () => {
            state.level = button.dataset.level || 'balanced';
            updateLevelButtons(elements);
        });
    });

    renderUpload(elements);
    renderCompressPanel(elements);
    updateLevelButtons(elements);
});

async function loadFile(elements) {
    const [file] = Array.from(elements.uploadInput.files || []);
    if (!file) {
        return;
    }

    try {
        state.upload = await createUploadRecord(file);
        elements.outputName.value = defaultOutputName(file.name);
        elements.uploadInput.value = '';
        clearFeedback(elements.feedback);
        renderUpload(elements);
        renderCompressPanel(elements);
    } catch (error) {
        renderFeedback(elements.feedback, error.message || 'Could not load the selected PDF file.', true);
    }
}

function renderUpload(elements) {
    const hasUpload = Boolean(state.upload);
    elements.root.dataset.emptyState = hasUpload ? 'false' : 'true';
    elements.uploadLaunch.classList.toggle('is-compact', hasUpload);
    elements.uploadCount.textContent = hasUpload ? '1 loaded' : '0 loaded';

    if (!hasUpload) {
        elements.uploadList.innerHTML = '';
        return;
    }

    elements.uploadList.innerHTML = `
        <article class="upload-item upload-item-preview">
            <img src="${state.upload.coverPreview}" alt="Preview of ${escapeHtml(state.upload.name)}">
            <div class="upload-item-body">
                <div class="upload-title">${escapeHtml(state.upload.name)}</div>
                <div class="upload-meta">${formatBytes(state.upload.size)} | ${state.upload.pageCount} pages</div>
            </div>
            <div class="upload-actions">
                <button class="button button-secondary" type="button" data-action="remove">Remove</button>
            </div>
        </article>
    `;

    elements.uploadList.querySelector('[data-action="remove"]').addEventListener('click', () => resetWorkspace(elements));
}

function renderCompressPanel(elements) {
    if (state.exportUrl) {
        URL.revokeObjectURL(state.exportUrl);
        state.exportUrl = null;
    }

    elements.exportResult.hidden = true;
    elements.exportResult.innerHTML = '';

    if (!state.upload) {
        elements.compressEmpty.hidden = false;
        elements.compressPanel.hidden = true;
        elements.sizeNote.textContent = 'No file';
        return;
    }

    elements.compressEmpty.hidden = true;
    elements.compressPanel.hidden = false;
    elements.sizeNote.textContent = formatBytes(state.upload.size);
    elements.originalSize.textContent = formatBytes(state.upload.size);
    elements.pageCount.textContent = String(state.upload.pageCount);
}

function updateLevelButtons(elements) {
    elements.levelButtons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.level === state.level);
    });
}

async function exportCompressedPdf(elements) {
    if (!state.upload) {
        renderFeedback(elements.feedback, 'Load one PDF before compressing.', true);
        return;
    }

    const button = elements.exportButton;
    const previousLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Compressing...';
    clearFeedback(elements.feedback);

    try {
        const result = await compressPdfUpload(
            state.upload,
            {
                ...COMPRESSION_LEVELS[state.level],
                outputName: elements.outputName.value || defaultOutputName(state.upload.name),
            },
            ({ pageNumber, pageCount }) => {
                button.textContent = `Compressing ${pageNumber}/${pageCount}`;
            },
        );

        state.exportUrl = result.url;
        triggerDownload(result.url, result.filename);
        elements.exportResult.hidden = false;
        elements.exportResult.innerHTML = `
            <span>${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)}</span>
        `;
    } catch (error) {
        renderFeedback(elements.feedback, error.message || 'Compression failed.', true);
    } finally {
        button.disabled = false;
        button.textContent = previousLabel;
    }
}

function resetWorkspace(elements) {
    if (state.exportUrl) {
        URL.revokeObjectURL(state.exportUrl);
    }

    state.upload = null;
    state.exportUrl = null;
    elements.uploadInput.value = '';
    clearFeedback(elements.feedback);
    renderUpload(elements);
    renderCompressPanel(elements);
}

function defaultOutputName(filename) {
    const cleanName = filename.replace(/\.pdf$/i, '');
    return sanitizeOutputName(`${cleanName}-compressed.pdf`);
}

function triggerDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
}
