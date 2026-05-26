# ECUDeck Agent Guide

Use this file as the fast-start context for AI coding agents working in this repository.

## Start Here

- Read [docs/developer-guide/index.md](docs/developer-guide/index.md) for the project direction and guide map.
- Read [docs/developer-guide/design-principles.md](docs/developer-guide/design-principles.md) before changing behavior across frontend, Tauri, Rust, or AI/review flows.
- Link to existing docs instead of re-embedding architecture guidance in code comments or new markdown.

## Stack And Commands

- Frontend: React 19 + Vite + TypeScript + Tailwind.
- Desktop shell: Tauri 2.
- Native/domain direction: Rust.
- Docs: MkDocs.

Primary commands:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run tauri`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `mkdocs serve`

Use the narrowest relevant validation for your change, then run the strongest practical local check before finishing.

## Architectural Boundaries

- Frontend orchestrates interaction, workflow, and visualization. See [dev_notes/frontend-level-architecture.md](dev_notes/frontend-level-architecture.md).
- The Tauri layer is a typed command/event bridge, not a dumping ground for business logic. See [dev_notes/tauri-command-bridge-architecture.md](dev_notes/tauri-command-bridge-architecture.md).
- Rust should own parsing, indexing, validation, checksums, jobs, and other deterministic or performance-critical work. See [dev_notes/rust-core-architecture.md](dev_notes/rust-core-architecture.md).
- Keep native boundaries explicit and typed. Do not hide cross-layer behavior inside random hooks or view components.
- AI-assisted changes are proposal-first and review-gated. Read [dev_notes/ai-chat-review-architecture.md](dev_notes/ai-chat-review-architecture.md) before changing AI/chat/review behavior.

## Repo-Specific Rules

- Do not add new product behavior under [legacy/](legacy/); that tree is reference material during migration.
- Prefer typed domain structures over loosely shaped maps or payloads.
- Do not put parsing, checksum, or heavy binary logic in React components.
- Do not attempt full BIN rendering in the frontend; chunk, stream, or virtualize instead.
- Keep transport details out of presentational components.
- Follow naming and file-placement rules in [docs/developer-guide/coding-standards.md](docs/developer-guide/coding-standards.md).

## Where To Look First

- Frontend/UI changes: [src/](src/), then [docs/developer-guide/design-principles.md](docs/developer-guide/design-principles.md), then [dev_notes/frontend-level-architecture.md](dev_notes/frontend-level-architecture.md).
- Native/Tauri changes: [src-tauri/](src-tauri/), then [dev_notes/tauri-command-bridge-architecture.md](dev_notes/tauri-command-bridge-architecture.md), then [docs/developer-guide/ffi-memory-contract.md](docs/developer-guide/ffi-memory-contract.md).
- Testing expectations: [docs/developer-guide/testing.md](docs/developer-guide/testing.md).
- Environment and Linux Tauri prerequisites: [docs/developer-guide/environment-setup.md](docs/developer-guide/environment-setup.md).
- Plugin work: [docs/developer-guide/plugins.md](docs/developer-guide/plugins.md) and [dev_notes/plugin-system-architecture.md](dev_notes/plugin-system-architecture.md).

## Validation Expectations

- For TypeScript/frontend changes, usually run `npm run typecheck` and the narrowest relevant test or lint step.
- For native changes, run `cargo check --manifest-path src-tauri/Cargo.toml` when the environment supports it.
- On Linux, Tauri checks may fail before app code due to missing `webkit2gtk-4.1` and `javascriptcoregtk-4.1` system packages.
- For docs-only changes, validate links and keep guidance aligned with existing developer-guide and dev_notes files.

## Documentation Strategy

- Prefer updating the existing document that owns a rule instead of scattering duplicate architecture notes.
- Use [docs/developer-guide/](docs/developer-guide/) for stable contributor guidance.
- Use [dev_notes/](dev_notes/) for evolving architecture direction and subsystem design.
