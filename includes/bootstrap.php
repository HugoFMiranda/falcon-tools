<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

foreach ($config['storage'] as $directory) {
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

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/functions.php';
