<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

$tools = tool_catalog();

render_layout('Dashboard', function () use ($tools): void {
    ?>
    <section class="center-shell">
        <div class="dashboard-shell">
            <h1 class="dashboard-title">Falcon Tools</h1>
            <section class="tool-grid tool-grid-minimal">
            <?php foreach ($tools as $tool): ?>
                <a class="tool-card tool-card-minimal<?= strtolower($tool['status']) === 'planned' ? ' is-planned' : '' ?>" href="<?= h($tool['href']) ?>" aria-label="<?= h($tool['title']) ?>">
                    <span class="tool-icon" aria-hidden="true"><?= h($tool['icon'] ?? '•') ?></span>
                    <span class="tool-subtitle"><?= h($tool['title']) ?></span>
                </a>
            <?php endforeach; ?>
            </section>
        </div>
        </section>
    <?php
});
