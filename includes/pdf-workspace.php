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
