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
        // On the VPS, webpage rendering runs through this wrapper as the
        // firewalled falcon-pdf user so rendered pages can't reach internal
        // services. Falls back to launching the browser directly when absent.
        'render_wrapper' => '/usr/local/bin/falcon-pdf-render',
        'render_wrapper_user' => 'falcon-pdf',
        'render_wrapper_output' => '/var/lib/falcon-pdf/out',
        'max_upload_size' => 25 * 1024 * 1024,
        'allowed_mime_types' => [
            'application/pdf',
            'application/x-pdf',
        ],
    ],
];
