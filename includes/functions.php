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

function render_layout(string $title, callable $content, array $options = []): void
{
    $appName = (string) app_config('app.name', 'Falcon Tools');
    $pageTitle = $title . ' | ' . $appName;
    $activePath = $options['active_path'] ?? current_path();
    $toolCards = $options['tool_cards'] ?? [];

    ?><!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?= h($pageTitle) ?></title>
        <link rel="stylesheet" href="<?= h(asset_url('css/app.css')) ?>">
    </head>
    <body>
        <div class="app-shell">
            <header class="site-header">
                <a class="brand" href="<?= h(url_for('/')) ?>"><?= h($appName) ?></a>
                <nav class="main-nav" aria-label="Primary navigation">
                    <a href="<?= h(url_for('/')) ?>"<?= $activePath === '/' ? ' aria-current="page"' : '' ?>>Dashboard</a>
                    <a href="<?= h(url_for('/tools/pdf/')) ?>"<?= str_starts_with($activePath, '/tools/pdf') ? ' aria-current="page"' : '' ?>>PDF Tools</a>
                </nav>
            </header>

            <main class="site-main">
                <?php $content(); ?>
            </main>

            <footer class="site-footer">
                <p>Falcon Tools is structured as a modular utility platform. More tools can be added without changing the shell.</p>
                <?php if ($toolCards !== []): ?>
                    <div class="footer-tags">
                        <?php foreach ($toolCards as $card): ?>
                            <span><?= h($card) ?></span>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </footer>
        </div>
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
            'description' => 'Upload PDFs, build a page merge queue, reorder pages, and export a combined file.',
        ],
        [
            'title' => 'Image Tools',
            'slug' => 'image',
            'href' => '#',
            'status' => 'Planned',
            'description' => 'Future home for image conversion, resizing, and lightweight edits.',
        ],
        [
            'title' => 'GIF Tools',
            'slug' => 'gif',
            'href' => '#',
            'status' => 'Planned',
            'description' => 'Future utilities for GIF creation, trimming, and compression.',
        ],
        [
            'title' => 'Video to GIF',
            'slug' => 'video',
            'href' => '#',
            'status' => 'Planned',
            'description' => 'Reserved for video extraction and animated export workflows.',
        ],
    ];
}
