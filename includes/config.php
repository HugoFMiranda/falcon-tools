<?php

declare(strict_types=1);

return [
    'app' => [
        'name' => 'Falcon Tools',
        'base_url' => '',
    ],
    'storage' => [
        'uploads' => '/var/lib/falcon-tools/uploads',
        'output'  => '/var/lib/falcon-tools/output',
        'temp'    => '/var/lib/falcon-tools/temp',
        'sessions' => '/var/lib/falcon-tools/sessions',
        'cleanup_after_seconds' => 24 * 60 * 60,
    ],
    'pdf' => [
        'qpdf_binary' => 'qpdf',
        'browser_binary' => '',
        'max_upload_size' => 25 * 1024 * 1024,
        'allowed_mime_types' => [
            'application/pdf',
            'application/x-pdf',
        ],
    ],
];
