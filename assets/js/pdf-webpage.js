import { clearFeedback, renderFeedback, sanitizeOutputName } from './pdf-shared.js';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-pdf-tool="webpage"]');
    if (!root) {
        return;
    }

    const elements = {
        urlInput: root.querySelector('[data-url-input]'),
        waitInput: root.querySelector('[data-wait-input]'),
        outputName: root.querySelector('[data-output-name]'),
        feedback: root.querySelector('[data-feedback]'),
        exportButton: root.querySelector('[data-export-button]'),
        exportResult: root.querySelector('[data-export-result]'),
        emptyNote: root.querySelector('[data-empty-note]'),
        statusNote: root.querySelector('[data-status-note]'),
    };

    const processor = window.FALCON_WEBPAGE_TO_PDF || { available: false, notes: '' };
    if (!processor.available) {
        renderFeedback(elements.feedback, processor.notes || 'No renderer is available for webpage export.', true);
        return;
    }

    elements.urlInput.addEventListener('input', () => {
        elements.exportResult.hidden = true;
        elements.exportResult.innerHTML = '';
    });

    elements.exportButton.addEventListener('click', async () => {
        const url = elements.urlInput.value.trim();
        if (url === '') {
            renderFeedback(elements.feedback, 'Enter a webpage URL.', true);
            return;
        }

        const outputName = sanitizeOutputName(elements.outputName.value || 'webpage.pdf');
        const waitMs = Number(elements.waitInput.value) || 4000;
        const originalLabel = elements.exportButton.textContent;

        elements.exportButton.disabled = true;
        elements.exportButton.textContent = 'Rendering...';
        elements.statusNote.textContent = 'working';
        clearFeedback(elements.feedback);

        try {
            const response = await fetch(new URL('../../api/pdf/webpage.php', window.location.href), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url,
                    outputName,
                    waitMs,
                }),
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Webpage rendering failed.');
            }

            const output = payload.data.output;
            triggerDownload(output.download_url, output.filename);
            elements.exportResult.hidden = false;
            elements.exportResult.innerHTML = `<span>${output.filename} · ${formatSize(output.size)}</span>`;
            elements.statusNote.textContent = 'ready';
            elements.emptyNote.textContent = 'Rendered and downloaded.';
        } catch (error) {
            renderFeedback(elements.feedback, error.message || 'Webpage rendering failed.', true);
            elements.statusNote.textContent = 'error';
        } finally {
            elements.exportButton.disabled = false;
            elements.exportButton.textContent = originalLabel;
        }
    });
});

function triggerDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
}

function formatSize(bytes) {
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
