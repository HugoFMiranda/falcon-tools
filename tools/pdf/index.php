<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';

render_layout('PDF Tools', function (): void {
    ?>
    <section class="center-shell">
        <section class="pdf-workspace" data-pdf-tool>
            <header class="page-heading">
                <a class="back-link" href="<?= h(url_for('/')) ?>">/ dashboard</a>
                <div class="page-heading-copy">
                    <h1 class="page-title">PDF Tools</h1>
                    <span class="subtle-note" data-engine-label>Browser-first workspace</span>
                </div>
            </header>

            <section class="mode-grid">
                <button class="tool-card tool-card-minimal is-active" type="button" data-tool-mode="merge">
                    <span class="tool-icon" aria-hidden="true"><?= render_icon('merge') ?></span>
                    <span class="tool-subtitle">Merge PDF</span>
                </button>
                <button class="tool-card tool-card-minimal" type="button" data-tool-mode="reorder">
                    <span class="tool-icon" aria-hidden="true"><?= render_icon('reorder') ?></span>
                    <span class="tool-subtitle">Reorder PDF</span>
                </button>
                <button class="tool-card tool-card-minimal" type="button" data-tool-mode="mix">
                    <span class="tool-icon" aria-hidden="true"><?= render_icon('mix') ?></span>
                    <span class="tool-subtitle">Custom Mix</span>
                </button>
            </section>

            <div class="workspace-split">
                <aside class="workspace-card upload-column stack-gap">
                    <div class="column-heading">
                        <h2>Files</h2>
                        <span class="mono-note" data-upload-count>0 files</span>
                    </div>

                    <form class="upload-form" data-upload-form>
                        <label class="dropzone" for="pdf-files">
                            <input id="pdf-files" type="file" name="pdf_files[]" accept="application/pdf" multiple>
                            <span class="dropzone-title">Load PDFs</span>
                            <span class="dropzone-copy">Kept locally unless you explicitly switch to server export.</span>
                        </label>
                        <div class="form-actions">
                            <button class="button button-primary" type="submit">Load Files</button>
                            <button class="button button-secondary" type="button" data-reset-workspace>Reset</button>
                        </div>
                    </form>

                    <div class="feedback" data-feedback hidden></div>
                    <div class="uploaded-list" data-upload-list></div>
                </aside>

                <section class="workspace-card action-column stack-gap">
                    <div class="action-header">
                        <div>
                            <h2 data-mode-title>Merge PDFs</h2>
                            <p class="subtle-note" data-mode-copy>Append full documents fast or pick specific pages when you need a custom order.</p>
                        </div>
                        <span class="mono-note" data-active-upload-label>Select a file to preview its pages.</span>
                    </div>

                    <div class="range-builder" data-range-builder hidden>
                        <label class="field-group">
                            <span>Add page range</span>
                            <input type="text" placeholder="1-3, 5, 8-10" data-range-input>
                        </label>
                        <button class="button button-secondary" type="button" data-add-range>Add Range</button>
                    </div>

                    <div class="page-browser-empty" data-page-browser-empty>Select a loaded PDF to inspect its pages.</div>
                    <div class="page-browser" data-page-browser hidden></div>

                    <div class="queue-topbar">
                        <h3>Action</h3>
                        <span class="mono-note" data-queue-count>0 pages selected</span>
                    </div>

                    <div class="queue-actions">
                        <label class="field-group">
                            <span>Output</span>
                            <input type="text" value="falcon-merged.pdf" data-output-name>
                        </label>
                        <label class="field-group">
                            <span>Mode</span>
                            <select data-export-mode>
                                <option value="browser" selected>Browser download</option>
                                <option value="server">Server export with qpdf</option>
                            </select>
                        </label>
                        <button class="button button-primary" type="button" data-export-button>Download PDF</button>
                    </div>
                    <div class="subtle-note" data-export-mode-note>Browser mode keeps PDFs in this tab and avoids uploading source files.</div>

                    <div class="queue-toolbar">
                        <button class="button button-secondary" type="button" data-remove-duplicates>Remove duplicates</button>
                        <button class="button button-secondary" type="button" data-group-duplicates>Highlight duplicates</button>
                    </div>

                    <div class="queue-empty" data-queue-empty>Add full PDFs or individual pages to build the final order.</div>
                    <div class="queue-list" data-queue-list></div>
                    <div class="export-result" data-export-result hidden></div>
                </section>
            </div>
        </section>
    </section>

    <script>
        window.FALCON_TOOLS = {
            endpoints: {
                state: <?= json_encode(url_for('/api/pdf/state.php')) ?>,
                upload: <?= json_encode(url_for('/api/pdf/upload.php')) ?>,
                export: <?= json_encode(url_for('/api/pdf/export.php')) ?>,
                cleanup: <?= json_encode(url_for('/api/pdf/cleanup.php')) ?>,
            },
        };
    </script>
    <script src="<?= h(asset_url('vendor/pdf-lib/pdf-lib.min.js')) ?>" defer></script>
    <script src="<?= h(asset_url('js/pdf-tool.js')) ?>" type="module"></script>
    <?php
});
