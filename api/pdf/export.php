<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/api.php';
require_once __DIR__ . '/../../includes/pdf.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_error('Method not allowed.', 405);
}

$payload = read_json_body();
$queue = $payload['queue'] ?? [];
$base64 = (string) ($payload['mergedDocumentBase64'] ?? '');
$outputName = (string) ($payload['outputName'] ?? 'falcon-merged.pdf');

if (!is_array($queue) || $queue === []) {
    api_error('The merge queue is empty.');
}

try {
    $normalizedQueue = pdf_normalize_queue($queue);
    if (pdf_processor_status()['available']) {
        $output = pdf_export_queue_with_qpdf($normalizedQueue, $outputName);
    } else {
        $binary = pdf_decode_binary_payload($base64);
        $output = pdf_register_output($outputName, $binary);
    }
} catch (RuntimeException $exception) {
    api_error($exception->getMessage(), 422);
}

api_success([
    'output' => $output,
    'summary' => [
        'page_count' => count($normalizedQueue),
        'source_count' => count(array_unique(array_column($normalizedQueue, 'upload_id'))),
    ],
    'processor' => pdf_processor_status(),
]);
