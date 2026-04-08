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

if (!is_array($queue) || $queue === []) {
    api_error('The merge queue is empty.');
}

try {
    $normalizedQueue = pdf_normalize_queue($queue);
} catch (RuntimeException $exception) {
    api_error($exception->getMessage(), 422);
}

api_success([
    'queue' => $normalizedQueue,
    'summary' => [
        'page_count' => count($normalizedQueue),
        'source_count' => count(array_unique(array_column($normalizedQueue, 'upload_id'))),
    ],
    'processor' => pdf_processor_status(),
]);
