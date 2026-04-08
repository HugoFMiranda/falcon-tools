# Falcon Tools

Falcon Tools is a small personal-use utility platform built with plain PHP, HTML, CSS, and JavaScript.

The project is structured as a multi-tool website from the start. The first live module is **PDF Page Operations**, and the layout is ready for future tools such as image utilities, GIF tools, video-to-GIF, and lightweight file conversion.

## Current MVP

The PDF module currently supports:

- Uploading one or more PDF files
- Listing uploaded PDFs for the current session
- Previewing pages with PDF.js
- Building a custom merge queue from pages across multiple PDFs
- Reordering queued pages
- Removing queued pages
- Exporting a final PDF
- Resetting the current workspace

## Folder Structure

```text
falcon-tools/
|-- api/
|   `-- pdf/
|       |-- cleanup.php
|       |-- download.php
|       |-- export.php
|       |-- file.php
|       |-- process.php
|       |-- state.php
|       `-- upload.php
|-- assets/
|   |-- css/
|   |   `-- app.css
|   `-- js/
|       |-- app.js
|       `-- pdf-tool.js
|-- includes/
|   |-- api.php
|   |-- bootstrap.php
|   |-- config.php
|   |-- functions.php
|   `-- pdf.php
|-- storage/
|   |-- output/
|   |-- sessions/
|   |-- temp/
|   `-- uploads/
|-- tools/
|   |-- gif/
|   |-- image/
|   |-- pdf/
|   |   `-- index.php
|   `-- video/
|-- .gitignore
|-- index.php
`-- README.md
```

## Architecture Summary

- `index.php` is the Falcon Tools dashboard.
- `tools/pdf/index.php` is the first tool module and uses the shared shell.
- `includes/` contains shared bootstrap, config, helpers, and PDF-specific backend logic.
- `api/pdf/` contains tool-specific JSON endpoints and file delivery endpoints.
- `storage/` holds temporary uploads, generated files, and PHP session storage.
- `assets/` is split between shared CSS/JS and tool-specific frontend modules.

This keeps the shell reusable while allowing each tool to have its own page, JavaScript module, PHP helpers, and API routes.

## How To Run Locally

### Option 1: PHP built-in server

From the project root:

```bash
php -S 127.0.0.1:8000 -t .
```

Then open:

```text
http://127.0.0.1:8000/
```

### Option 2: XAMPP, Laragon, MAMP

- Place the project inside your web root.
- Point your local host or virtual host to the project folder.
- Open the project in the browser.

If Falcon Tools is hosted in a subdirectory instead of the web root, set `app.base_url` in [`includes/config.php`](/D:/development/apps/falcon-tools/includes/config.php).

## Required PHP Settings

Recommended minimums:

- `file_uploads = On`
- `upload_max_filesize = 25M` or higher
- `post_max_size = 32M` or higher
- `max_file_uploads = 20` or higher
- `session.save_path` can remain default, but this project stores sessions in `storage/sessions/`
- `mime_content_type()` support should be available through `fileinfo`

The app creates any missing storage folders automatically on boot.

## qpdf Integration

The codebase is prepared for qpdf, but the MVP currently exports by:

1. building the merged PDF in the browser with `pdf-lib`
2. sending the final PDF bytes to PHP
3. storing the finished file in `storage/output/`

### Where qpdf should be configured

- Set the qpdf binary path in [`includes/config.php`](/D:/development/apps/falcon-tools/includes/config.php) under `pdf.qpdf_binary`
- qpdf detection and processor status live in [`includes/pdf.php`](/D:/development/apps/falcon-tools/includes/pdf.php)

### Where qpdf should be wired in next

- [`api/pdf/process.php`](/D:/development/apps/falcon-tools/api/pdf/process.php)
  This is the right place to turn the UI queue into a validated server-side page plan.
- [`api/pdf/export.php`](/D:/development/apps/falcon-tools/api/pdf/export.php)
  This should switch from accepting `mergedDocumentBase64` to invoking qpdf with the normalized queue.
- [`includes/pdf.php`](/D:/development/apps/falcon-tools/includes/pdf.php)
  Add a command builder and execution wrapper here so qpdf invocation stays out of page controllers.

## Adding Future Tools

Use the same pattern as the PDF module:

1. Create a new tool page under `tools/<tool-name>/index.php`
2. Add any tool-specific frontend logic to `assets/js/`
3. Add tool-specific API routes under `api/<tool-name>/`
4. Add shared or tool-specific backend helpers under `includes/`
5. Register the new module in `tool_catalog()` inside [`includes/functions.php`](/D:/development/apps/falcon-tools/includes/functions.php)
6. Reuse the shared layout through `render_layout()`

Example future modules:

- `tools/image/`
- `api/image/`
- `includes/image.php`
- `assets/js/image-tool.js`

## Notes

- Uploaded and exported files are intentionally temporary.
- There is no authentication or database in this MVP.
- The current PDF workflow is optimized for simplicity and personal use rather than large-scale batch processing.
