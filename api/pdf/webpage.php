<?php

declare(strict_types=1);

require __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/api.php';
require_once __DIR__ . '/../../includes/pdf.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_error('Method not allowed.', 405);
}

$payload = read_json_body();
$url = (string) ($payload['url'] ?? '');
$outputName = (string) ($payload['outputName'] ?? 'webpage.pdf');
$waitMs = (int) ($payload['waitMs'] ?? 4000);

try {
    $output = pdf_render_webpage_to_pdf($url, $outputName, [
        'wait_ms' => $waitMs,
    ]);
} catch (RuntimeException $exception) {
    api_error($exception->getMessage(), 422);
}

api_success([
    'output' => $output,
    'processor' => pdf_webpage_processor_status(),
]);
