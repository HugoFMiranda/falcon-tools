<?php

declare(strict_types=1);

require_once __DIR__ . '/functions.php';

function read_json_body(): array
{
    $raw = file_get_contents('php://input');

    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);

    if (!is_array($decoded)) {
        api_error('Invalid JSON payload.', 400);
    }

    return $decoded;
}

function api_response(array $payload, int $statusCode = 200): never
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function api_success(array $payload = [], int $statusCode = 200): never
{
    api_response([
        'success' => true,
        'data' => $payload,
    ], $statusCode);
}

function api_error(string $message, int $statusCode = 400, array $extra = []): never
{
    api_response([
        'success' => false,
        'error' => $message,
        'details' => $extra,
    ], $statusCode);
}
