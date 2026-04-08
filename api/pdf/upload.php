<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/api.php';
require_once __DIR__ . '/../../includes/pdf.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_error('Method not allowed.', 405);
}

$files = $_FILES['pdf_files'] ?? null;
if ($files === null || !isset($files['name']) || !is_array($files['name'])) {
    api_error('No files were uploaded.');
}

$uploaded = [];
$errors = [];

foreach ($files['name'] as $index => $name) {
    $file = [
        'name' => $name,
        'type' => $files['type'][$index] ?? '',
        'tmp_name' => $files['tmp_name'][$index] ?? '',
        'error' => $files['error'][$index] ?? UPLOAD_ERR_NO_FILE,
        'size' => $files['size'][$index] ?? 0,
    ];

    try {
        $uploaded[] = pdf_register_upload($file);
    } catch (RuntimeException $exception) {
        $errors[] = [
            'name' => $name,
            'message' => $exception->getMessage(),
        ];
    }
}

if ($uploaded === [] && $errors !== []) {
    api_error('No files could be uploaded.', 422, ['files' => $errors]);
}

api_success([
    'message' => $errors === []
        ? 'PDF upload complete.'
        : 'Some PDFs were uploaded, but a few files were rejected.',
    'uploads' => array_map('pdf_public_upload_record', pdf_uploads()),
    'errors' => $errors,
]);
