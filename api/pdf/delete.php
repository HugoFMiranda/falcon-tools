<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/api.php';
require_once __DIR__ . '/../../includes/pdf.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_error('Method not allowed.', 405);
}

$payload = read_json_body();
$uploadId = (string) ($payload['uploadId'] ?? '');

if ($uploadId === '') {
    api_error('Upload ID is required.');
}

if (!pdf_delete_upload($uploadId)) {
    api_error('The requested upload could not be found.', 404);
}

api_success([
    'message' => 'Upload removed from the workspace.',
    'uploads' => array_map('pdf_public_upload_record', pdf_uploads()),
]);
