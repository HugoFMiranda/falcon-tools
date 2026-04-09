<?php

declare(strict_types=1);

function pdf_mode_catalog(): array
{
    return [
        'merge' => [
            'title' => 'Merge PDF',
            'description' => 'Combine full PDFs or selected pages.',
            'icon' => 'files',
            'href' => url_for('/tools/pdf/merge.php'),
        ],
        'reorder' => [
            'title' => 'Reorder PDF',
            'description' => 'Rebuild the page sequence visually.',
            'icon' => 'arrow-up-down',
            'href' => url_for('/tools/pdf/reorder.php'),
        ],
        'compress' => [
            'title' => 'Compress PDF',
            'description' => 'Shrink one PDF for easier sharing.',
            'icon' => 'minimize-2',
            'href' => url_for('/tools/pdf/compress.php'),
        ],
        'webpage' => [
            'title' => 'Webpage to PDF',
            'description' => 'Render a webpage into a PDF.',
            'icon' => 'globe',
            'href' => url_for('/tools/pdf/webpage.php'),
        ],
        'mix' => [
            'title' => 'Custom Mix',
            'description' => 'Compose a hand-picked page sequence.',
            'icon' => 'blend',
            'href' => url_for('/tools/pdf/mix.php'),
        ],
    ];
}

function render_merge_workspace(string $mode = 'merge'): void
{
    $modes = pdf_mode_catalog();
    $current = $modes[$mode] ?? $modes['merge'];
    ?>
    <section class="center-shell center-shell-top">
        <section class="pdf-workspace pdf-workspace-detail pdf-workspace-wide" data-pdf-tool="merge">
            <header class="page-heading">
                <a class="back-link" href="<?= h(url_for('/tools/pdf/')) ?>">/ pdf tools</a>
                <div class="page-heading-copy">
                    <h1 class="page-title"><?= h($current['title']) ?></h1>
                </div>
            </header>

            <div class="workspace-split">
                <aside class="workspace-card upload-column stack-gap">
                    <div class="column-heading">
                        <h2>Files</h2>
                        <div class="column-heading-actions">
                            <span class="mono-note" data-upload-count>0 loaded</span>
                            <button class="subtle-icon-button" type="button" data-reset-button aria-label="Reset files" title="Reset files">
                                <span data-lucide="brush-cleaning"></span>
                            </button>
                        </div>
                    </div>

                    <label class="upload-launch" for="pdf-files">
                        <input id="pdf-files" type="file" accept="application/pdf" multiple data-upload-input>
                        <span class="upload-launch-icon" data-lucide="plus"></span>
                        <span class="upload-launch-title">Load PDFs</span>
                    </label>

                    <div class="feedback" data-feedback hidden></div>
                    <div class="uploaded-list" data-upload-list></div>
                </aside>

                <section class="workspace-card action-column stack-gap">
                    <div class="action-header">
                        <h2>Select Pages</h2>
                        <span class="mono-note" data-selection-count>0 selected</span>
                    </div>

                    <div class="merge-groups-empty" data-page-browser-empty>No PDFs loaded.</div>
                    <div class="merge-groups" data-page-groups hidden></div>
                    <div class="footer-action-bar">
                        <label class="field-group footer-field">
                            <span>Output</span>
                            <input type="text" value="falcon-merged.pdf" data-output-name>
                        </label>
                        <button class="button button-primary" type="button" data-export-button>Download PDF</button>
                    </div>
                    <div class="export-result" data-export-result hidden></div>
                </section>
            </div>
        </section>
    </section>

    <script>
        window.FALCON_TOOLS = {
            defaultMode: <?= json_encode($mode) ?>
        };
    </script>
    <script src="<?= h(asset_url('vendor/pdf-lib/pdf-lib.min.js')) ?>" defer></script>
    <script src="<?= h(asset_url('js/pdf-merge.js')) ?>" type="module"></script>
    <?php
}

function render_reorder_workspace(): void
{
    ?>
    <section class="center-shell center-shell-top">
        <section class="pdf-workspace pdf-workspace-detail pdf-workspace-wide" data-pdf-tool="reorder">
            <header class="page-heading">
                <a class="back-link" href="<?= h(url_for('/tools/pdf/')) ?>">/ pdf tools</a>
                <div class="page-heading-copy">
                    <h1 class="page-title">Reorder PDF</h1>
                </div>
            </header>

            <div class="workspace-split">
                <aside class="workspace-card upload-column stack-gap">
                    <div class="column-heading">
                        <h2>Files</h2>
                        <div class="column-heading-actions">
                            <span class="mono-note" data-upload-count>0 loaded</span>
                            <button class="subtle-icon-button" type="button" data-reset-button aria-label="Reset files" title="Reset files">
                                <span data-lucide="brush-cleaning"></span>
                            </button>
                        </div>
                    </div>

                    <label class="upload-launch" for="reorder-pdf-files">
                        <input id="reorder-pdf-files" type="file" accept="application/pdf" multiple data-upload-input>
                        <span class="upload-launch-icon" data-lucide="plus"></span>
                        <span class="upload-launch-title">Load PDFs</span>
                    </label>

                    <div class="feedback" data-feedback hidden></div>
                    <div class="uploaded-list" data-upload-list></div>
                </aside>

                <section class="workspace-card action-column stack-gap">
                    <div class="action-header">
                        <h2>Sequence</h2>
                        <span class="mono-note" data-sequence-count>0 pages</span>
                    </div>

                    <div class="merge-groups-empty" data-canvas-empty>No PDFs loaded.</div>
                    <div class="reorder-canvas" data-reorder-canvas hidden></div>
                    <div class="footer-action-bar">
                        <label class="field-group footer-field">
                            <span>Output</span>
                            <input type="text" value="falcon-reordered.pdf" data-output-name>
                        </label>
                        <button class="button button-primary" type="button" data-export-button>Download PDF</button>
                    </div>
                    <div class="export-result" data-export-result hidden></div>
                </section>
            </div>
        </section>
    </section>

    <script src="<?= h(asset_url('vendor/pdf-lib/pdf-lib.min.js')) ?>" defer></script>
    <script src="<?= h(asset_url('js/pdf-reorder.js')) ?>" type="module"></script>
    <?php
}

function render_compress_workspace(): void
{
    ?>
    <section class="center-shell center-shell-top">
        <section class="pdf-workspace pdf-workspace-detail pdf-workspace-wide" data-pdf-tool="compress">
            <header class="page-heading">
                <a class="back-link" href="<?= h(url_for('/tools/pdf/')) ?>">/ pdf tools</a>
                <div class="page-heading-copy">
                    <h1 class="page-title">Compress PDF</h1>
                </div>
            </header>

            <div class="workspace-split">
                <aside class="workspace-card upload-column stack-gap">
                    <div class="column-heading">
                        <h2>File</h2>
                        <div class="column-heading-actions">
                            <span class="mono-note" data-upload-count>0 loaded</span>
                            <button class="subtle-icon-button" type="button" data-reset-button aria-label="Reset file" title="Reset file">
                                <span data-lucide="brush-cleaning"></span>
                            </button>
                        </div>
                    </div>

                    <label class="upload-launch" for="compress-pdf-file">
                        <input id="compress-pdf-file" type="file" accept="application/pdf" data-upload-input>
                        <span class="upload-launch-icon" data-lucide="plus"></span>
                        <span class="upload-launch-title">Load PDF</span>
                    </label>

                    <div class="feedback" data-feedback hidden></div>
                    <div class="uploaded-list" data-upload-list></div>
                </aside>

                <section class="workspace-card action-column stack-gap">
                    <div class="action-header">
                        <h2>Compression</h2>
                        <span class="mono-note" data-file-size-note>No file</span>
                    </div>

                    <div class="compress-empty" data-compress-empty>No PDF loaded.</div>
                    <div class="compress-panel stack-gap" data-compress-panel hidden>
                        <div class="compress-levels" data-levels>
                            <button class="level-card is-active" type="button" data-level="balanced">
                                <span class="level-title">Balanced</span>
                                <span class="level-meta">Good quality</span>
                            </button>
                            <button class="level-card" type="button" data-level="strong">
                                <span class="level-title">Strong</span>
                                <span class="level-meta">Smaller file</span>
                            </button>
                            <button class="level-card" type="button" data-level="maximum">
                                <span class="level-title">Maximum</span>
                                <span class="level-meta">Most aggressive</span>
                            </button>
                        </div>

                        <div class="compress-summary" data-summary>
                            <div class="summary-pill">
                                <span class="summary-label">Pages</span>
                                <span class="summary-value" data-page-count>0</span>
                            </div>
                            <div class="summary-pill">
                                <span class="summary-label">Original</span>
                                <span class="summary-value" data-original-size>0 KB</span>
                            </div>
                        </div>

                        <div class="footer-action-bar">
                            <label class="field-group footer-field">
                                <span>Output</span>
                                <input type="text" value="falcon-compressed.pdf" data-output-name>
                            </label>
                            <button class="button button-primary" type="button" data-export-button>Compress PDF</button>
                        </div>
                    </div>
                    <div class="export-result" data-export-result hidden></div>
                </section>
            </div>
        </section>
    </section>

    <script src="<?= h(asset_url('vendor/pdf-lib/pdf-lib.min.js')) ?>" defer></script>
    <script src="<?= h(asset_url('js/pdf-compress.js')) ?>" type="module"></script>
    <?php
}

function render_webpage_workspace(): void
{
    $processor = pdf_webpage_processor_status();
    ?>
    <section class="center-shell center-shell-top">
        <section class="pdf-workspace pdf-workspace-detail pdf-workspace-wide" data-pdf-tool="webpage">
            <header class="page-heading">
                <a class="back-link" href="<?= h(url_for('/tools/pdf/')) ?>">/ pdf tools</a>
                <div class="page-heading-copy">
                    <h1 class="page-title">Webpage to PDF</h1>
                </div>
            </header>

            <div class="workspace-split">
                <aside class="workspace-card upload-column stack-gap">
                    <div class="column-heading">
                        <h2>Page</h2>
                        <div class="column-heading-actions">
                            <span class="mono-note" data-renderer-note><?= h($processor['available'] ? 'renderer ready' : 'renderer missing') ?></span>
                        </div>
                    </div>

                    <div class="stack-gap">
                        <label class="field-group">
                            <span>URL</span>
                            <input type="url" placeholder="https://example.com" data-url-input>
                        </label>

                        <label class="field-group">
                            <span>Wait</span>
                            <select data-wait-input>
                                <option value="2000">Fast</option>
                                <option value="4000" selected>Balanced</option>
                                <option value="7000">Slow pages</option>
                            </select>
                        </label>
                    </div>

                    <div class="feedback" data-feedback hidden></div>
                </aside>

                <section class="workspace-card action-column stack-gap">
                    <div class="action-header">
                        <h2>Export</h2>
                        <span class="mono-note" data-status-note><?= h($processor['available'] ? 'ready' : 'unavailable') ?></span>
                    </div>

                    <div class="compress-empty" data-empty-note><?= h($processor['available'] ? 'Enter a webpage URL.' : 'Install Chrome or Chromium to use this tool.') ?></div>

                    <div class="footer-action-bar">
                        <label class="field-group footer-field">
                            <span>Output</span>
                            <input type="text" value="webpage.pdf" data-output-name>
                        </label>
                        <button class="button button-primary" type="button" data-export-button <?= $processor['available'] ? '' : 'disabled' ?>>Create PDF</button>
                    </div>
                    <div class="export-result" data-export-result hidden></div>
                </section>
            </div>
        </section>
    </section>

    <script>
        window.FALCON_WEBPAGE_TO_PDF = <?= json_encode([
            'available' => $processor['available'],
            'notes' => $processor['notes'],
        ]) ?>;
    </script>
    <script src="<?= h(asset_url('js/pdf-webpage.js')) ?>" type="module"></script>
    <?php
}
