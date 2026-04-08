<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/api.php';
require_once __DIR__ . '/../../includes/pdf.php';

api_success([
    'uploads' => array_map('pdf_public_upload_record', pdf_uploads()),
    'outputs' => array_map('pdf_public_output_record', pdf_outputs()),
    'processor' => pdf_processor_status(),
]);
