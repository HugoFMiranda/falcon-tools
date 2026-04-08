<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

$tools = tool_catalog();

render_layout('Dashboard', function () use ($tools): void {
    ?>
    <section class="hero-panel">
        <div>
            <p class="eyebrow">Personal Utility Platform</p>
            <h1>Falcon Tools</h1>
            <p class="lead">A modular PHP utilities dashboard built for small file workflows. Start with PDF page operations and expand into image, GIF, and file conversion tools over time.</p>
        </div>
        <a class="button button-primary" href="/tools/pdf/">Open PDF Tool</a>
    </section>

    <section class="section-heading">
        <div>
            <p class="eyebrow">Tool Modules</p>
            <h2>Current and planned utilities</h2>
        </div>
    </section>

    <section class="tool-grid">
        <?php foreach ($tools as $tool): ?>
            <article class="tool-card">
                <div class="tool-card-top">
                    <span class="status-pill status-<?= h(strtolower($tool['status'])) ?>"><?= h($tool['status']) ?></span>
                    <h3><?= h($tool['title']) ?></h3>
                </div>
                <p><?= h($tool['description']) ?></p>
                <a class="text-link" href="<?= h($tool['href']) ?>">View module</a>
            </article>
        <?php endforeach; ?>
    </section>
    <?php
}, [
    'active_path' => '/',
    'tool_cards' => ['PDF', 'Image', 'GIF', 'Video', 'Conversion'],
]);
