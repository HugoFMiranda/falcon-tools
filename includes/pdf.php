<?php

declare(strict_types=1);

require_once __DIR__ . '/functions.php';

function pdf_state(): array
{
    if (!isset($_SESSION['pdf_tool']) || !is_array($_SESSION['pdf_tool'])) {
        $_SESSION['pdf_tool'] = [
            'uploads' => [],
            'outputs' => [],
        ];
    }

    return $_SESSION['pdf_tool'];
}

function pdf_save_state(array $state): void
{
    $_SESSION['pdf_tool'] = $state;
}

function pdf_uploads(): array
{
    $state = pdf_state();

    return array_values($state['uploads']);
}

function pdf_outputs(): array
{
    $state = pdf_state();

    return array_values($state['outputs']);
}

function pdf_sanitize_filename(string $filename): string
{
    $clean = preg_replace('/[^A-Za-z0-9._-]+/', '-', $filename) ?? 'document.pdf';
    $clean = trim($clean, '.-');

    if ($clean === '') {
        return 'document.pdf';
    }

    return $clean;
}

function pdf_make_id(string $prefix): string
{
    return $prefix . '_' . bin2hex(random_bytes(6));
}

function pdf_validate_upload(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return [false, 'Upload failed before the file reached the server.'];
    }

    $tmpName = $file['tmp_name'] ?? '';
    $size = (int) ($file['size'] ?? 0);
    $name = (string) ($file['name'] ?? 'document.pdf');

    if ($size <= 0) {
        return [false, 'Uploaded file is empty.'];
    }

    $maxSize = (int) app_config('pdf.max_upload_size', 26214400);
    if ($size > $maxSize) {
        return [false, 'File exceeds the configured upload size limit.'];
    }

    $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if ($extension !== 'pdf') {
        return [false, 'Only PDF files are allowed.'];
    }

    $mimeType = mime_content_type($tmpName) ?: '';
    $allowedMimeTypes = app_config('pdf.allowed_mime_types', []);
    if (!in_array($mimeType, $allowedMimeTypes, true)) {
        return [false, 'The uploaded file does not look like a valid PDF.'];
    }

    return [true, ''];
}

function pdf_register_upload(array $file): array
{
    [$valid, $message] = pdf_validate_upload($file);

    if (!$valid) {
        throw new RuntimeException($message);
    }

    $originalName = (string) $file['name'];
    $safeName = pdf_sanitize_filename($originalName);
    $uploadId = pdf_make_id('upload');
    $storedName = $uploadId . '-' . $safeName;
    $destination = app_config('storage.uploads') . DIRECTORY_SEPARATOR . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new RuntimeException('Could not move the uploaded file into storage.');
    }

    $record = [
        'id' => $uploadId,
        'original_name' => $originalName,
        'stored_name' => $storedName,
        'size' => (int) $file['size'],
        'page_count' => pdf_extract_page_count($destination),
        'path' => $destination,
        'uploaded_at' => date(DATE_ATOM),
        'file_url' => url_for('/api/pdf/file.php?id=' . rawurlencode($uploadId)),
    ];

    $state = pdf_state();
    $state['uploads'][$uploadId] = $record;
    pdf_save_state($state);

    return pdf_public_upload_record($record);
}

function pdf_public_upload_record(array $record): array
{
    return [
        'id' => $record['id'],
        'original_name' => $record['original_name'],
        'stored_name' => $record['stored_name'],
        'size' => $record['size'],
        'page_count' => $record['page_count'] ?? null,
        'uploaded_at' => $record['uploaded_at'],
        'file_url' => $record['file_url'],
    ];
}

function pdf_get_upload(string $uploadId): ?array
{
    $state = pdf_state();

    return $state['uploads'][$uploadId] ?? null;
}

function pdf_register_output(string $filename, string $binaryContent): array
{
    $outputId = pdf_make_id('output');
    $safeName = pdf_sanitize_filename($filename);
    if (strtolower(pathinfo($safeName, PATHINFO_EXTENSION)) !== 'pdf') {
        $safeName .= '.pdf';
    }

    $storedName = $outputId . '-' . $safeName;
    $destination = app_config('storage.output') . DIRECTORY_SEPARATOR . $storedName;

    if (file_put_contents($destination, $binaryContent) === false) {
        throw new RuntimeException('Could not write the generated PDF to output storage.');
    }

    $record = [
        'id' => $outputId,
        'filename' => $safeName,
        'stored_name' => $storedName,
        'path' => $destination,
        'size' => filesize($destination) ?: 0,
        'created_at' => date(DATE_ATOM),
        'download_url' => url_for('/api/pdf/download.php?id=' . rawurlencode($outputId)),
    ];

    $state = pdf_state();
    $state['outputs'][$outputId] = $record;
    pdf_save_state($state);

    return pdf_public_output_record($record);
}

function pdf_register_output_file(string $filename, string $sourcePath): array
{
    if (!is_file($sourcePath)) {
        throw new RuntimeException('The generated PDF output file could not be found.');
    }

    $binaryContent = file_get_contents($sourcePath);
    if ($binaryContent === false) {
        throw new RuntimeException('Could not read the generated PDF output file.');
    }

    return pdf_register_output($filename, $binaryContent);
}

function pdf_public_output_record(array $record): array
{
    return [
        'id' => $record['id'],
        'filename' => $record['filename'],
        'size' => $record['size'],
        'created_at' => $record['created_at'],
        'download_url' => $record['download_url'],
    ];
}

function pdf_get_output(string $outputId): ?array
{
    $state = pdf_state();

    return $state['outputs'][$outputId] ?? null;
}

function pdf_cleanup_workspace(): void
{
    $state = pdf_state();

    foreach ($state['uploads'] as $upload) {
        if (isset($upload['path']) && is_file($upload['path'])) {
            unlink($upload['path']);
        }
    }

    foreach ($state['outputs'] as $output) {
        if (isset($output['path']) && is_file($output['path'])) {
            unlink($output['path']);
        }
    }

    pdf_save_state([
        'uploads' => [],
        'outputs' => [],
    ]);
}

function pdf_normalize_queue(array $queue): array
{
    $normalized = [];

    foreach ($queue as $index => $item) {
        $uploadId = (string) ($item['uploadId'] ?? '');
        $pageNumber = (int) ($item['pageNumber'] ?? 0);

        if ($uploadId === '' || $pageNumber < 1) {
            throw new RuntimeException('Queue item #' . ($index + 1) . ' is missing a valid upload or page number.');
        }

        $upload = pdf_get_upload($uploadId);
        if ($upload === null) {
            throw new RuntimeException('Queue item #' . ($index + 1) . ' refers to an upload that is no longer available.');
        }

        $pageCount = $upload['page_count'] ?? null;
        if (is_int($pageCount) && $pageNumber > $pageCount) {
            throw new RuntimeException('Queue item #' . ($index + 1) . ' requests a page outside the uploaded PDF range.');
        }

        $normalized[] = [
            'queue_id' => (string) ($item['queueId'] ?? pdf_make_id('queue')),
            'upload_id' => $uploadId,
            'upload_name' => $upload['original_name'],
            'upload_path' => $upload['path'],
            'page_number' => $pageNumber,
        ];
    }

    return $normalized;
}

function pdf_processor_status(): array
{
    $binary = pdf_find_qpdf_binary();
    $available = $binary !== null;

    return [
        'engine' => $available ? 'qpdf-server' : 'browser-fallback',
        'binary' => $binary ?? (string) app_config('pdf.qpdf_binary', 'qpdf'),
        'available' => $available,
        'notes' => $available
            ? 'qpdf is available. Export can be assembled on the server from the validated page queue.'
            : 'qpdf was not detected. Export currently uses a browser-built PDF payload and stores the result through PHP.',
    ];
}

function pdf_decode_binary_payload(string $base64): string
{
    // The MVP compiles the final PDF in the browser, then hands the binary back to PHP for storage.
    // This keeps the export working today while leaving qpdf room to take over server-side assembly later.
    $decoded = base64_decode($base64, true);

    if ($decoded === false || $decoded === '') {
        throw new RuntimeException('Export payload is empty or invalid.');
    }

    return $decoded;
}

function pdf_extract_page_count(string $path): ?int
{
    $binary = pdf_find_qpdf_binary();
    if ($binary === null) {
        return null;
    }

    [$exitCode, $stdout] = pdf_run_command([
        $binary,
        '--show-npages',
        $path,
    ]);

    if ($exitCode !== 0) {
        return null;
    }

    $pageCount = (int) trim($stdout);

    return $pageCount > 0 ? $pageCount : null;
}

function pdf_export_queue_with_qpdf(array $normalizedQueue, string $outputName): array
{
    $binary = pdf_find_qpdf_binary();
    if ($binary === null) {
        throw new RuntimeException('qpdf is not available on this server.');
    }

    $tempOutputPath = app_config('storage.temp') . DIRECTORY_SEPARATOR . pdf_make_id('qpdf') . '.pdf';
    $command = [$binary, '--empty', '--pages'];

    foreach ($normalizedQueue as $item) {
        $command[] = $item['upload_path'];
        $command[] = (string) $item['page_number'];
    }

    $command[] = '--';
    $command[] = $tempOutputPath;

    [$exitCode, $stdout, $stderr] = pdf_run_command($command);

    if ($exitCode !== 0 || !is_file($tempOutputPath)) {
        @unlink($tempOutputPath);
        throw new RuntimeException('qpdf export failed. ' . trim($stderr !== '' ? $stderr : $stdout));
    }

    try {
        return pdf_register_output_file($outputName, $tempOutputPath);
    } finally {
        @unlink($tempOutputPath);
    }
}

function pdf_find_qpdf_binary(): ?string
{
    static $resolved = false;
    static $binaryPath = null;

    if ($resolved) {
        return $binaryPath;
    }

    $configured = trim((string) app_config('pdf.qpdf_binary', 'qpdf'));

    if ($configured !== '' && preg_match('/[\\\\\\/]/', $configured) === 1 && is_file($configured)) {
        $resolved = true;
        $binaryPath = $configured;

        return $binaryPath;
    }

    $locator = PHP_OS_FAMILY === 'Windows'
        ? 'where ' . escapeshellarg($configured)
        : 'command -v ' . escapeshellarg($configured);

    [$exitCode, $stdout] = pdf_run_shell_lookup($locator);

    if ($exitCode !== 0) {
        $resolved = true;
        $binaryPath = null;

        return null;
    }

    $lines = preg_split('/\R+/', trim($stdout)) ?: [];
    foreach ($lines as $line) {
        $candidate = trim($line);
        if ($candidate === '' || str_starts_with(strtoupper($candidate), 'INFO:')) {
            continue;
        }

        if (PHP_OS_FAMILY !== 'Windows' || is_file($candidate)) {
            $resolved = true;
            $binaryPath = $candidate;

            return $binaryPath;
        }
    }

    $resolved = true;
    $binaryPath = null;

    return null;
}

function pdf_run_shell_lookup(string $command): array
{
    if (!function_exists('exec')) {
        return [1, ''];
    }

    $output = [];
    $exitCode = 1;
    exec($command . ' 2>&1', $output, $exitCode);

    return [$exitCode, trim(implode(PHP_EOL, $output))];
}

function pdf_run_command(array $parts): array
{
    if (!function_exists('exec')) {
        throw new RuntimeException('PHP exec() is required for qpdf integration.');
    }

    $escapedCommand = implode(' ', array_map(static fn (string $part): string => escapeshellarg($part), $parts));
    $output = [];
    $exitCode = 1;
    exec($escapedCommand . ' 2>&1', $output, $exitCode);
    $stdout = trim(implode(PHP_EOL, $output));

    return [$exitCode, $stdout, $stdout];
}
