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
    $mainClass = trim('site-main ' . (is_string($options['main_class'] ?? null) ? $options['main_class'] : ''));

    ?><!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?= h($pageTitle) ?></title>
        <link rel="stylesheet" href="<?= h(asset_url('css/app.css')) ?>">
    </head>
    <body>
        <main class="<?= h($mainClass) ?>">
            <?php $content(); ?>
        </main>
        <footer class="site-footer">
            <span>Created by <a href="https://github.com/HugoFMiranda" target="_blank" rel="noopener">HugoFMiranda</a></span>
            <a class="site-footer-github" href="https://github.com/HugoFMiranda/falcon-tools" target="_blank" rel="noopener">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
            </a>
        </footer>
        <script src="<?= h(asset_url('vendor/lucide/lucide.min.js')) ?>" defer></script>
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
        'pdf' => 'file-text',
        'image' => 'image',
        'gif' => 'film',
        'video' => 'video',
        'files' => 'files',
        'arrow-up-down' => 'arrow-up-down',
        'minimize-2' => 'minimize-2',
        'globe' => 'globe',
        'blend' => 'blend',
    ];

    $icon = $icons[$name] ?? 'file-text';

    return '<span data-lucide="' . h($icon) . '"></span>';
}
