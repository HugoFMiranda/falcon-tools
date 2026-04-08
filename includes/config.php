<?php

declare(strict_types=1);

return [
    'app' => [
        'name' => 'Falcon Tools',
        'base_url' => '',
    ],
    'storage' => [
        'uploads' => __DIR__ . '/../storage/uploads',
        'output' => __DIR__ . '/../storage/output',
        'temp' => __DIR__ . '/../storage/temp',
        'sessions' => __DIR__ . '/../storage/sessions',
    ],
    'pdf' => [
        'qpdf_binary' => 'qpdf',
        'max_upload_size' => 25 * 1024 * 1024,
        'allowed_mime_types' => [
            'application/pdf',
            'application/x-pdf',
        ],
    ],
];
