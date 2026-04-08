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
                    <h2>Load PDFs</h2>
                </div>
                <span class="subtle-note" data-engine-label>Browser-first workspace</span>
            </div>

            <form class="upload-form" data-upload-form>
                <label class="dropzone" for="pdf-files">
                    <input id="pdf-files" type="file" name="pdf_files[]" accept="application/pdf" multiple>
                    <span class="dropzone-title">Drop PDFs here or browse files</span>
                    <span class="dropzone-copy">Files stay in this browser tab for previews, queue building, and export.</span>
                </label>
                <div class="form-actions">
                    <button class="button button-primary" type="submit">Add to workspace</button>
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
                        <h2>Loaded PDFs</h2>
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
                    <span class="subtle-note" data-active-upload-label>Preview one PDF at a time</span>
                </div>
                <div class="range-builder" data-range-builder hidden>
                    <label class="field-group">
                        <span>Add page range from current PDF</span>
                        <input type="text" placeholder="Examples: 1-3, 5, 8-10" data-range-input>
                    </label>
                    <button class="button button-secondary" type="button" data-add-range>Add range to queue</button>
                </div>
                <div class="page-browser-empty" data-page-browser-empty>Select a loaded PDF to inspect its pages.</div>
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
                <button class="button button-primary" type="button" data-export-button>Download final PDF</button>
            </div>

            <div class="queue-empty" data-queue-empty>Add pages from any uploaded PDF to build the final order.</div>
            <div class="queue-list" data-queue-list></div>
            <div class="export-result" data-export-result hidden></div>
        </section>
    </section>

    <script src="<?= h(asset_url('vendor/pdf-lib/pdf-lib.min.js')) ?>" defer></script>
    <script src="<?= h(asset_url('js/pdf-tool.js')) ?>" type="module"></script>
    <?php
}, [
    'active_path' => '/tools/pdf/',
    'tool_cards' => ['Upload', 'Queue', 'Reorder', 'Export'],
]);
