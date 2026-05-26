# ECUDeck Documentation

ECUDeck is being migrated to a desktop-first stack based on Vite, React, Rust, Tauri, and MkDocs.

## Current Focus

- remove Next.js-specific structure and tooling
- preserve the editor UI while moving to a desktop-friendly architecture
- establish the Rust/Tauri shell for future filesystem, parsing, and job execution
- move documentation into a stable MkDocs workflow

## Key References

- `new structure plan.md`
- `src/` for the active frontend
- `src-tauri/` for the desktop shell scaffold
- `legacy/python_backend/` for old experimental parsing code kept during migration
