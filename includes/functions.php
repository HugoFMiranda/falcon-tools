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
            'icon' => '◫',
            'description' => 'Upload PDFs, build a page merge queue, reorder pages, and export a combined file.',
        ],
        [
            'title' => 'Image Tools',
            'slug' => 'image',
            'href' => '#',
            'status' => 'Planned',
            'icon' => '◩',
            'description' => 'Future home for image conversion, resizing, and lightweight edits.',
        ],
        [
            'title' => 'GIF Tools',
            'slug' => 'gif',
            'href' => '#',
            'status' => 'Planned',
            'icon' => '◎',
            'description' => 'Future utilities for GIF creation, trimming, and compression.',
        ],
        [
            'title' => 'Video to GIF',
            'slug' => 'video',
            'href' => '#',
            'status' => 'Planned',
            'icon' => '◬',
            'description' => 'Reserved for video extraction and animated export workflows.',
        ],
    ];
}
