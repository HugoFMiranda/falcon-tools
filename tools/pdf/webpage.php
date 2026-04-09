<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/pdf-workspace.php';
require_once __DIR__ . '/../../includes/pdf.php';

render_layout('Webpage to PDF', function (): void {
    render_webpage_workspace();
}, [
    'main_class' => 'site-main-wide',
]);
