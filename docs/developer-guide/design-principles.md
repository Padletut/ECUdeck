# Design Principles

These are the core invariants and architectural rules for ECUDeck.

## Deterministic First

Deterministic extraction, validation, and analysis should happen before higher-level AI reasoning.

AI can assist interpretation.
It should not replace deterministic core logic where deterministic logic is possible.

## Review Before Apply

AI-assisted actions should produce proposals that can be reviewed before they mutate project state.

This is especially important for:

- plugin authoring
- generated edits
- calibration-related recommendations
- structured project changes

## Workspace, Not Single File

ECUDeck should behave like an engineering workspace.

The project model should favor:

- workspaces
- projects
- firmware files
- sessions
- plugin references

## Frontend Orchestrates, Core Computes

The frontend owns:

- interaction design
- workflow orchestration
- state and visualization

Rust owns:

- parsing
- indexing
- validation
- checksums
- job execution
- performance-critical operations

## Native Boundaries Stay Explicit

Do not hide cross-layer behavior.

Boundaries between:

- frontend
- Tauri command bridge
- Rust core
- model providers

should remain explicit and typed.

## No Full BIN Rendering

Large firmware files must be chunked, streamed, or virtualized.

The frontend should not attempt to render full binaries at once.

## Version Contracts Early

Plugin contracts, schemas, and integration surfaces should be versioned early to avoid ecosystem breakage later.

## Documentation Lives in the Repo

Architecture, invariants, and subsystem rules should live next to the codebase.

If a behavior is important enough to preserve, it is important enough to document.
