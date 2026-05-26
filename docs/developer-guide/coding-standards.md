# Coding Standards

These standards keep the project readable, stable, and contributor-friendly.

## General Rules

- Prefer simple, explicit code over clever code.
- Keep subsystem boundaries visible in naming and file placement.
- Add comments only when they explain intent or non-obvious behavior.
- Avoid hidden side effects.

## Naming

Recommended conventions:

- React components: `PascalCase`
- hooks: `useCamelCase`
- utility functions: `camelCase`
- Rust modules and files: `snake_case`
- Markdown files: `kebab-case.md`

## File Ownership

Put code where it logically belongs.

Examples:

- shared UI primitives in `shared/ui`
- feature-specific views in `features/*`
- Rust command glue in Tauri/native layers
- heavy parsing logic in Rust, not in React components

## Formatting

Use project tooling instead of manual formatting where possible.

Primary commands:

- `npm run lint`
- `npm run format`
- `npm run typecheck`

## Frontend Conventions

- Keep components focused.
- Prefer composition over giant multi-purpose views.
- Keep transport and command details out of presentational components.
- Avoid turning all state into global state.

## Rust Conventions

- prefer typed domain structures over loosely typed maps
- return structured errors instead of stringly control flow
- keep parsing and validation deterministic
- do not bury ownership semantics

## Documentation Conventions

- Write in clear English.
- Prefer concrete terms over vague claims.
- Explain purpose, inputs, outputs, invariants, and failure modes when relevant.
