import * as pdfjsLib from '../vendor/pdfjs/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).toString();

export async function createUploadRecord(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error(`${file.name} is not a PDF file.`);
    }

    const sourceBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(sourceBuffer.slice(0));
    const pdfWorkerBytes = new Uint8Array(sourceBuffer.slice(0));
    const pdfDocument = await pdfjsLib.getDocument({ data: pdfWorkerBytes }).promise;
    const preview = await renderPreview(pdfDocument, 1, 0.34);

    return {
        id: makeId('upload'),
        file,
        bytes,
        name: file.name,
        size: file.size,
        pageCount: pdfDocument.numPages,
        coverPreview: preview,
        previews: new Map([[1, preview]]),
    };
}

export async function ensurePagePreviews(upload, scale = 0.34) {
    const workerBytes = new Uint8Array(upload.bytes.buffer.slice(0));
    const pdfDocument = await pdfjsLib.getDocument({ data: workerBytes }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        let preview = upload.previews.get(pageNumber);

        if (!preview) {
            preview = await renderPreview(pdfDocument, pageNumber, scale);
            upload.previews.set(pageNumber, preview);
        }

        pages.push({
            pageNumber,
            preview,
        });
    }

    return pages;
}

export async function compressPdfUpload(upload, options = {}, onProgress = null) {
    const { PDFDocument } = window.PDFLib;
    const quality = clampNumber(options.quality, 0.35, 0.92, 0.76);
    const renderScale = clampNumber(options.renderScale, 0.55, 1.5, 1);
    const targetName = sanitizeOutputName(options.outputName || upload.name || 'falcon-compressed.pdf');
    const workerBytes = new Uint8Array(upload.bytes.buffer.slice(0));
    const pdfDocument = await pdfjsLib.getDocument({ data: workerBytes }).promise;
    const outputPdf = await PDFDocument.create();

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const sourceViewport = page.getViewport({ scale: 1 });
        const renderViewport = page.getViewport({ scale: renderScale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });

        canvas.width = Math.max(1, Math.round(renderViewport.width));
        canvas.height = Math.max(1, Math.round(renderViewport.height));
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: context, viewport: renderViewport }).promise;

        const imageDataUrl = canvas.toDataURL('image/jpeg', quality);
        const imageBytes = dataUrlToUint8Array(imageDataUrl);
        const jpgImage = await outputPdf.embedJpg(imageBytes);
        const outputPage = outputPdf.addPage([sourceViewport.width, sourceViewport.height]);

        outputPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: sourceViewport.width,
            height: sourceViewport.height,
        });

        if (typeof onProgress === 'function') {
            onProgress({
                pageNumber,
                pageCount: pdfDocument.numPages,
            });
        }
    }

    const bytes = await outputPdf.save({ useObjectStreams: true });
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    return {
        url,
        filename: targetName,
        originalSize: upload.size,
        compressedSize: bytes.length,
        pageCount: pdfDocument.numPages,
    };
}

export async function buildPdfFromSequence(sequence, uploadsById, outputName) {
    const { PDFDocument, degrees } = window.PDFLib;
    const mergedPdf = await PDFDocument.create();
    const sourceCache = new Map();

    for (const item of sequence) {
        if (!sourceCache.has(item.uploadId)) {
            const upload = uploadsById.get(item.uploadId);
            if (!upload) {
                throw new Error(`Source PDF ${item.uploadName || item.uploadId} is no longer available.`);
            }

            sourceCache.set(item.uploadId, await PDFDocument.load(upload.bytes));
        }

        const sourcePdf = sourceCache.get(item.uploadId);
        const [page] = await mergedPdf.copyPages(sourcePdf, [item.pageNumber - 1]);
        const rotation = normalizeRotation(item.rotation ?? 0);
        if (rotation !== 0) {
            const baseRotation = page.getRotation().angle ?? 0;
            page.setRotation(degrees(normalizeRotation(baseRotation + rotation)));
        }
        mergedPdf.addPage(page);
    }

    const bytes = await mergedPdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    return {
        url,
        filename: sanitizeOutputName(outputName),
        pageCount: sequence.length,
    };
}

export function formatBytes(bytes) {
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

export function sanitizeOutputName(value, fallback = 'falcon-output.pdf') {
    const trimmed = value.trim();
    const safe = (trimmed === '' ? fallback : trimmed).replace(/[^A-Za-z0-9._-]+/g, '-');

    return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
}

export function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeRotation(value) {
    const normalized = Number(value) || 0;
    return ((normalized % 360) + 360) % 360;
}

export function renderFeedback(element, message, isError = false) {
    element.hidden = false;
    element.textContent = message;
    element.style.background = isError ? 'rgba(255, 246, 236, 0.94)' : 'rgba(236, 248, 255, 0.92)';
    element.style.color = isError ? '#9a6a34' : '#2563eb';
}

export function clearFeedback(element) {
    element.hidden = true;
    element.textContent = '';
}

async function renderPreview(pdfDocument, pageNumber, scale) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    return canvas.toDataURL('image/jpeg', 0.84);
}

function clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, numeric));
}

function dataUrlToUint8Array(dataUrl) {
    const [, base64 = ''] = dataUrl.split(',');
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}
