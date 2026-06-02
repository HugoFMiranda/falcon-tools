<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

foreach ($config['storage'] as $directory) {
    if (!is_string($directory)) {
        continue;
    }

    if (!is_dir($directory)) {
        mkdir($directory, 0775, true);
    }
}

date_default_timezone_set('Europe/Lisbon');

session_name('falcon_tools');
$sessionPath = $config['storage']['sessions'];
if (is_dir($sessionPath)) {
    session_save_path($sessionPath);
}

$_csrfMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($_csrfMethod, ['GET', 'HEAD', 'OPTIONS'], true)) {
    $_csrfOrigin = $_SERVER['HTTP_ORIGIN'] ?? null;
    if ($_csrfOrigin !== null) {
        $_csrfAllowed = 'https://' . ($_SERVER['HTTP_HOST'] ?? '');
        if ($_csrfOrigin !== $_csrfAllowed) {
            http_response_code(403);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode(['success' => false, 'error' => 'Forbidden.']);
            exit;
        }
    }
}
unset($_csrfMethod, $_csrfOrigin, $_csrfAllowed);

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_secure'   => true,
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
        'use_strict_mode' => 1,
    ]);
}

require_once __DIR__ . '/functions.php';

cleanup_stale_storage_files();
