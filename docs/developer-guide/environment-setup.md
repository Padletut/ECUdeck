# Environment Setup

Set up your development environment for the current ECUDeck stack.

## Required Tools

- `node` and `npm`
- `rustup`, `cargo`, and a stable Rust toolchain
- system dependencies required by Tauri on your platform
- Python 3 for legacy or experimental scripts
- MkDocs for documentation work

## Current Stack

The active stack is:

- Vite + React
- Tauri
- Rust
- MkDocs

Legacy Python code may still exist for reference, but new platform work should assume the stack above.

## Frontend Setup

1. Install JavaScript dependencies with `npm install`.
2. Start the frontend with `npm run dev`.
3. Build the frontend with `npm run build`.

## Tauri / Rust Setup

1. Make sure Rust is installed through `rustup`.
2. Verify Cargo is available with `cargo --version`.
3. Use `npm run tauri` for Tauri CLI entry points.
4. Run `cargo check` inside `src-tauri/` when working on native code.

## Linux Note

On Linux, Tauri requires native WebKit and JavaScriptCore development libraries.

At minimum, install the platform equivalents of:

- `webkit2gtk-4.1`
- `javascriptcoregtk-4.1`

If `cargo check` fails on `webkit2gtk-sys` or `javascriptcore-rs-sys`, your system packages are usually the missing piece.

## Documentation Setup

If you work on docs:

1. Install MkDocs in your preferred Python environment.
2. Run `mkdocs serve` from the repository root.
3. Keep `mkdocs.yml` and `docs/` in sync.

## Optional Local AI Providers

For model integration work, you may also run:

- Ollama
- llama-server

Suggested local environment variables are described in `.env`.

## Sanity Checks

Before starting feature work, verify:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

If you are touching Rust:

- `cargo check` in `src-tauri/`
