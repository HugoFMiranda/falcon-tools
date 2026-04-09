<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/pdf-workspace.php';

render_layout('PDF Tools', function (): void {
    $modes = pdf_mode_catalog();
    ?>
    <section class="center-shell">
        <section class="dashboard-shell">
            <header class="page-heading">
                <a class="back-link" href="<?= h(url_for('/')) ?>">/ dashboard</a>
                <div class="page-heading-copy">
                    <h1 class="page-title">PDF Tools</h1>
                    <span class="subtle-note">Choose one action.</span>
                </div>
            </header>

            <section class="mode-grid">
                <?php foreach ($modes as $mode): ?>
                    <a class="tool-card tool-card-minimal" href="<?= h($mode['href']) ?>">
                        <span class="tool-icon" aria-hidden="true"><?= render_icon($mode['icon']) ?></span>
                        <span class="tool-subtitle"><?= h($mode['title']) ?></span>
                    </a>
                <?php endforeach; ?>
            </section>
        </section>
    </section>
    <?php
}, [
    'main_class' => 'site-main-wide',
]);
