<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/pdf-workspace.php';

render_layout('Compress PDF', function (): void {
    render_compress_workspace();
}, [
    'main_class' => 'site-main-wide',
]);
