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

    <section class="workspace-card">
        <h2>Module loading</h2>
        <p>The shell is ready. The interactive PDF workflow will be attached here by the tool-specific frontend module.</p>
    </section>

    <script src="<?= h(asset_url('js/pdf-tool.js')) ?>" defer></script>
    <?php
}, [
    'active_path' => '/tools/pdf/',
    'tool_cards' => ['Upload', 'Queue', 'Reorder', 'Export'],
]);
