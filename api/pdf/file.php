<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/pdf.php';

$uploadId = (string) ($_GET['id'] ?? '');
$upload = pdf_get_upload($uploadId);

if ($upload === null || !is_file($upload['path'])) {
    http_response_code(404);
    exit('File not found.');
}

header('Content-Type: application/pdf');
header('Content-Length: ' . filesize($upload['path']));
header('Content-Disposition: inline; filename="' . rawurlencode($upload['original_name']) . '"');
readfile($upload['path']);
exit;
