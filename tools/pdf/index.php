<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';

render_layout('PDF Tools', function (): void {
    ?>
    <section class="hero-panel hero-panel-compact">
        <div>
            <p class="eyebrow">Tool Module</p>
            <h1>PDF Page Operations</h1>
            <p class="lead">Upload PDFs, inspect their pages, build a custom merge queue, and export a final file. Backend processing is structured for qpdf integration.</p>
        </div>
    </section>

    <section class="pdf-workspace" data-pdf-tool>
        <div class="workspace-card stack-gap">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Step 1</p>
                    <h2>Upload PDFs</h2>
                </div>
                <span class="subtle-note" data-engine-label>Checking processor...</span>
            </div>

            <form class="upload-form" data-upload-form>
                <label class="dropzone" for="pdf-files">
                    <input id="pdf-files" type="file" name="pdf_files[]" accept="application/pdf" multiple>
                    <span class="dropzone-title">Drop PDFs here or browse files</span>
                    <span class="dropzone-copy">Files are stored temporarily in `storage/uploads/` for this session.</span>
                </label>
                <div class="form-actions">
                    <button class="button button-primary" type="submit">Upload files</button>
                    <button class="button button-secondary" type="button" data-reset-workspace>Reset workspace</button>
                </div>
            </form>

            <div class="feedback" data-feedback hidden></div>
        </div>

        <div class="pdf-grid">
            <section class="workspace-card stack-gap">
                <div class="panel-heading">
                    <div>
                        <p class="eyebrow">Step 2</p>
                        <h2>Uploaded PDFs</h2>
                    </div>
                    <span class="subtle-note" data-upload-count>0 files</span>
                </div>
                <div class="uploaded-list" data-upload-list></div>
            </section>

            <section class="workspace-card stack-gap">
                <div class="panel-heading">
                    <div>
                        <p class="eyebrow">Step 3</p>
                        <h2>Page Browser</h2>
                    </div>
                    <span class="subtle-note">Preview one PDF at a time</span>
                </div>
                <div class="page-browser-empty" data-page-browser-empty>Select an uploaded PDF to inspect its pages.</div>
                <div class="page-browser" data-page-browser hidden></div>
            </section>
        </div>

        <section class="workspace-card stack-gap">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Step 4</p>
                    <h2>Merge Queue</h2>
                </div>
                <span class="subtle-note" data-queue-count>0 pages selected</span>
            </div>

            <div class="queue-actions">
                <label class="field-group">
                    <span>Output file name</span>
                    <input type="text" value="falcon-merged.pdf" data-output-name>
                </label>
                <button class="button button-primary" type="button" data-export-button>Export final PDF</button>
            </div>

            <div class="queue-empty" data-queue-empty>Add pages from any uploaded PDF to build the final order.</div>
            <div class="queue-list" data-queue-list></div>
            <div class="export-result" data-export-result hidden></div>
        </section>
    </section>

    <script>
        window.FALCON_TOOLS = {
            baseUrl: <?= json_encode(rtrim((string) app_config('app.base_url', ''), '/')) ?>,
            endpoints: {
                state: <?= json_encode(url_for('/api/pdf/state.php')) ?>,
                upload: <?= json_encode(url_for('/api/pdf/upload.php')) ?>,
                process: <?= json_encode(url_for('/api/pdf/process.php')) ?>,
                export: <?= json_encode(url_for('/api/pdf/export.php')) ?>,
                cleanup: <?= json_encode(url_for('/api/pdf/cleanup.php')) ?>,
            },
            pdfJsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js',
        };
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js" defer></script>
    <script src="<?= h(asset_url('js/pdf-tool.js')) ?>" defer></script>
    <?php
}, [
    'active_path' => '/tools/pdf/',
    'tool_cards' => ['Upload', 'Queue', 'Reorder', 'Export'],
]);
