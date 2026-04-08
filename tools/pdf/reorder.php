<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/pdf-workspace.php';

render_layout('Reorder PDF', function (): void {
    render_pdf_workspace('reorder');
});
