<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/pdf.php';

$outputId = (string) ($_GET['id'] ?? '');
$output = pdf_get_output($outputId);

if ($output === null || !is_file($output['path'])) {
    http_response_code(404);
    exit('File not found.');
}

header('Content-Type: application/pdf');
header('Content-Length: ' . filesize($output['path']));
header('Content-Disposition: attachment; filename="' . rawurlencode($output['filename']) . '"');
readfile($output['path']);
exit;
