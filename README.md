# Falcon Tools

Falcon Tools is a personal-use utility platform built with plain PHP, HTML, CSS, and JavaScript.

It is structured as a multi-tool website from the start. The current live area is the PDF suite, with separate focused tools instead of a single overloaded page.

## Current PDF Tools

- `Merge PDF`
  Load multiple PDFs, select pages, rotate pages, and export one merged PDF.
- `Reorder PDF`
  Load PDFs, drag pages into a new order, rotate pages, and export the rebuilt PDF.
- `Compress PDF`
  Load one PDF, choose a compression level, and download a smaller browser-generated PDF.
- `Webpage to PDF`
  Enter a URL and render it to PDF on the server with headless Chrome or Chromium.
- `Custom Mix`
  Available as a PDF action route and currently reuses the merge-style page selection flow.

## Folder Structure

```text
falcon-tools/
|-- api/
|   `-- pdf/
|       |-- cleanup.php
|       |-- delete.php
|       |-- download.php
|       |-- export.php
|       |-- file.php
|       |-- process.php
|       |-- state.php
|       |-- upload.php
|       `-- webpage.php
|-- assets/
|   |-- css/
|   |   `-- app.css
|   |-- js/
|   |   |-- app.js
|   |   |-- pdf-compress.js
|   |   |-- pdf-merge.js
|   |   |-- pdf-reorder.js
|   |   |-- pdf-shared.js
|   |   `-- pdf-webpage.js
|   `-- vendor/
|       |-- lucide/
|       |-- pdf-lib/
|       `-- pdfjs/
|-- includes/
|   |-- api.php
|   |-- bootstrap.php
|   |-- config.php
|   |-- functions.php
|   |-- pdf.php
|   `-- pdf-workspace.php
|-- storage/
|   |-- output/
|   |-- sessions/
|   |-- temp/
|   `-- uploads/
|-- tools/
|   `-- pdf/
|       |-- compress.php
|       |-- index.php
|       |-- merge.php
|       |-- mix.php
|       |-- reorder.php
|       `-- webpage.php
|-- index.php
|-- README.md
`-- start-local.bat
```

## Architecture Summary

- [index.php](/D:/development/apps/falcon-tools/index.php) is the Falcon Tools dashboard.
- [tools/pdf/index.php](/D:/development/apps/falcon-tools/tools/pdf/index.php) is the PDF tool chooser.
- Each PDF action has its own page:
  - [merge.php](/D:/development/apps/falcon-tools/tools/pdf/merge.php)
  - [reorder.php](/D:/development/apps/falcon-tools/tools/pdf/reorder.php)
  - [compress.php](/D:/development/apps/falcon-tools/tools/pdf/compress.php)
  - [webpage.php](/D:/development/apps/falcon-tools/tools/pdf/webpage.php)
- Shared shell and tool registration live in [includes/functions.php](/D:/development/apps/falcon-tools/includes/functions.php).
- Shared PDF route rendering lives in [includes/pdf-workspace.php](/D:/development/apps/falcon-tools/includes/pdf-workspace.php).
- Shared PDF backend helpers and command wrappers live in [includes/pdf.php](/D:/development/apps/falcon-tools/includes/pdf.php).
- JSON endpoints and file delivery routes live under [api/pdf/](/D:/development/apps/falcon-tools/api/pdf).

This keeps the platform modular without introducing a framework.

## How To Run Locally

### Option 1: One-click launcher

Use:

```bat
start-local.bat
```

or double-click [start-local.bat](/D:/development/apps/falcon-tools/start-local.bat).

It starts the app at:

```text
http://127.0.0.1:8000/
```

The script prefers `php` from PATH and falls back to common local Windows PHP locations.

### Option 2: PHP built-in server

From the project root:

```bash
php -S 127.0.0.1:8000 -t .
```

Then open:

```text
http://127.0.0.1:8000/
```

If port `8000` is busy, use another port such as `8010`.

### Option 3: XAMPP, Laragon, MAMP

- Put the project inside your web root.
- Point your local host or virtual host to the project folder.
- Open the project through HTTP in the browser.

If Falcon Tools is hosted in a subdirectory, set `app.base_url` in [includes/config.php](/D:/development/apps/falcon-tools/includes/config.php).

## Required PHP Settings

Recommended minimums:

- `file_uploads = On`
- `upload_max_filesize = 25M` or higher
- `post_max_size = 32M` or higher
- `max_file_uploads = 20` or higher
- `fileinfo` enabled for `mime_content_type()`
- `exec()` enabled if you want qpdf or webpage-to-PDF server rendering

The app creates missing storage folders automatically at boot.

Stale files in `storage/uploads/`, `storage/output/`, and `storage/temp/` are cleaned automatically after 24 hours by default. Adjust `storage.cleanup_after_seconds` in [includes/config.php](/D:/development/apps/falcon-tools/includes/config.php) if needed.

## PDF Processing Notes

### Browser-first tools

These tools are browser-first:

- Merge PDF
- Reorder PDF
- Compress PDF

They keep source PDFs in the tab and generate output in the browser unless a server-side path is explicitly needed.

### qpdf integration

qpdf is prepared for server-side structural PDF work.

Configure it in [includes/config.php](/D:/development/apps/falcon-tools/includes/config.php):

- `pdf.qpdf_binary`

The wrapper and detection logic live in [includes/pdf.php](/D:/development/apps/falcon-tools/includes/pdf.php).

Current qpdf use cases in the codebase:

- page-count extraction when qpdf is available
- server-side export path for queue-based PDF assembly

### Webpage to PDF renderer

`Webpage to PDF` uses headless Chrome or Chromium, not qpdf.

Configure an explicit browser path if needed in [includes/config.php](/D:/development/apps/falcon-tools/includes/config.php):

- `pdf.browser_binary`

If left blank, Falcon Tools tries to detect common Chrome, Chromium, or Edge binaries automatically.

The renderer wrapper is implemented in [includes/pdf.php](/D:/development/apps/falcon-tools/includes/pdf.php), and the endpoint is [api/pdf/webpage.php](/D:/development/apps/falcon-tools/api/pdf/webpage.php).

Important limitations:

- login-protected pages may not work
- bot-protected pages may fail
- some pages need extra wait time before render
- only `http` and `https` URLs are supported

## Adding Future Tools

Use the current pattern:

1. Add a route under `tools/<tool>/`
2. Add any frontend logic under `assets/js/`
3. Add backend helpers under `includes/`
4. Add API endpoints under `api/<tool>/` if needed
5. Register the tool card or action in shared catalogs
6. Reuse `render_layout()` for the shared shell

For a new PDF action, follow the current PDF chooser approach:

1. Add the action entry in [includes/pdf-workspace.php](/D:/development/apps/falcon-tools/includes/pdf-workspace.php)
2. Add a dedicated page under [tools/pdf/](/D:/development/apps/falcon-tools/tools/pdf)
3. Add a dedicated JS module in [assets/js/](/D:/development/apps/falcon-tools/assets/js)
4. Add server helpers or endpoints only if that action actually needs them

## Notes

- Source PDFs for merge/reorder/compress are not uploaded to the server by default.
- Generated server-side outputs are stored temporarily in `storage/output/`.
- There is no authentication and no database in this project.
- This app is optimized for simple personal use and clean hosting on a standard PHP server.
