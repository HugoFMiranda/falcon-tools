<?php

declare(strict_types=1);

function app_config(?string $path = null, mixed $default = null): mixed
{
    global $config;

    if ($path === null) {
        return $config;
    }

    $segments = explode('.', $path);
    $value = $config;

    foreach ($segments as $segment) {
        if (!is_array($value) || !array_key_exists($segment, $value)) {
            return $default;
        }

        $value = $value[$segment];
    }

    return $value;
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function asset_url(string $path): string
{
    $baseUrl = rtrim((string) app_config('app.base_url', ''), '/');

    return $baseUrl . '/assets/' . ltrim($path, '/');
}

function url_for(string $path = ''): string
{
    $baseUrl = rtrim((string) app_config('app.base_url', ''), '/');
    $normalized = '/' . ltrim($path, '/');

    if ($normalized === '/') {
        return $baseUrl === '' ? '/' : $baseUrl . '/';
    }

    return $baseUrl . $normalized;
}

function current_path(): string
{
    return parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
}

function cleanup_stale_storage_files(): void
{
    $storageConfig = app_config('storage', []);
    $maxAge = (int) ($storageConfig['cleanup_after_seconds'] ?? 0);

    if ($maxAge <= 0) {
        return;
    }

    foreach (['uploads', 'output', 'temp'] as $key) {
        $directory = $storageConfig[$key] ?? null;
        if (!is_string($directory) || !is_dir($directory)) {
            continue;
        }

        $items = scandir($directory);
        if ($items === false) {
            continue;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..' || $item === '.gitkeep') {
                continue;
            }

            $path = $directory . DIRECTORY_SEPARATOR . $item;
            if (!is_file($path)) {
                continue;
            }

            $modifiedAt = filemtime($path);
            if ($modifiedAt === false) {
                continue;
            }

            if ((time() - $modifiedAt) >= $maxAge) {
                @unlink($path);
            }
        }
    }
}

function render_layout(string $title, callable $content, array $options = []): void
{
    $appName = (string) app_config('app.name', 'Falcon Tools');
    $pageTitle = $title . ' | ' . $appName;

    ?><!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?= h($pageTitle) ?></title>
        <link rel="stylesheet" href="<?= h(asset_url('css/app.css')) ?>">
    </head>
    <body>
        <main class="site-main">
            <?php $content(); ?>
        </main>
        <script src="<?= h(asset_url('js/app.js')) ?>" defer></script>
    </body>
    </html><?php
}

function tool_catalog(): array
{
    return [
        [
            'title' => 'PDF Page Operations',
            'slug' => 'pdf',
            'href' => url_for('/tools/pdf/'),
            'status' => 'Live',
            'icon' => 'pdf',
            'description' => 'Upload PDFs, build a page merge queue, reorder pages, and export a combined file.',
        ],
        [
            'title' => 'Image Tools',
            'slug' => 'image',
            'href' => '#',
            'status' => 'Planned',
            'icon' => 'image',
            'description' => 'Future home for image conversion, resizing, and lightweight edits.',
        ],
        [
            'title' => 'GIF Tools',
            'slug' => 'gif',
            'href' => '#',
            'status' => 'Planned',
            'icon' => 'gif',
            'description' => 'Future utilities for GIF creation, trimming, and compression.',
        ],
        [
            'title' => 'Video to GIF',
            'slug' => 'video',
            'href' => '#',
            'status' => 'Planned',
            'icon' => 'video',
            'description' => 'Reserved for video extraction and animated export workflows.',
        ],
    ];
}

function render_icon(string $name): string
{
    $icons = [
        'pdf' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.5h6.5L20.5 9v10.25A2.25 2.25 0 0 1 18.25 21.5H8A2.5 2.5 0 0 1 5.5 19V6A2.5 2.5 0 0 1 8 3.5Zm6 1.75V9h4.25" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.25 16.75h2.1c1.1 0 1.82-.68 1.82-1.67 0-.98-.72-1.65-1.82-1.65h-2.1v3.32Zm0 0v1.5m5.1-4.82v4.82m0-4.82h1.15c1.37 0 2.26.93 2.26 2.41 0 1.49-.89 2.41-2.26 2.41h-1.15m-5.1-1.02h1.78m8.08-3.8h-1.92v4.82" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'image' => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="m7 16 3.2-3.2a1.1 1.1 0 0 1 1.56 0L14 15l1.7-1.7a1.1 1.1 0 0 1 1.56 0L20 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'gif' => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.3 13.2h1.9v2H7.8c-1.2 0-2-.82-2-2.12v-1.2c0-1.3.8-2.12 2-2.12h1.4m3.2.08v5.36m2.3-5.36v5.36m0-2.42h1.86" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'video' => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="13" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m16.5 10 4-2.2v8.4l-4-2.2V10Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
        'merge' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5h4.5M7 9h6.5M7 12.5h4.5M7 18.5h4.5M13.5 15h3m0 0-1.7-1.7M16.5 15l-1.7 1.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="3.5" width="8" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
        'reorder' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5h8M9 12h8M9 17.5h8M5.5 4.5v15m0 0-2-2m2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'mix' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 7.5h4v4h-4zm7 0h4v4h-4zm-7 7h4v4h-4zm7 0h4v4h-4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10.5 9.5h3m-3 5h3m-5-3v3m9-8v3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    ];

    return $icons[$name] ?? $icons['pdf'];
}
