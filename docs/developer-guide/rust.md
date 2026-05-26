# Rust

This guide covers how Rust should be used in ECUDeck.

## Rust's Role

Rust is the long-term home for:

- BIN parsing
- binary indexing
- map discovery
- checksum handling
- dependency graph construction
- semantic validation
- background jobs
- performance-critical data movement

## Current Native Layout

Today, the desktop shell lives in:

- `src-tauri/`

Over time, more of the platform logic should move into Rust-oriented subsystems and crates.

## Architectural Rule

Do not place core ECU behavior in the Tauri shell just because the shell is already Rust.

Separate:

- desktop integration concerns
- command bridge concerns
- domain logic concerns

## Suggested Rust Boundaries

Long term, Rust code should separate into clear domains such as:

- parser
- indexing
- maps
- graph
- checksums
- jobs
- plugins
- risk

## Errors

Use structured error handling.

Prefer:

- typed error enums
- context-rich errors
- stable command responses

Avoid:

- opaque string errors as the only contract
- silent fallback behavior in core logic

## Serde and Command Contracts

Any data crossing into the frontend should be serializable, documented, and stable enough to evolve safely.

The frontend should consume intentional command contracts, not internal implementation details.

## Tests

Rust code should be tested with:

- unit tests for algorithms and parsing helpers
- integration tests for workflow behavior
- fixture-based tests for binary handling
- benchmarks for performance-sensitive paths

See also:

- [Testing](./testing.md)
- [Rust Performance](./rust-performance.md)
- [FFI Memory Contract](./ffi-memory-contract.md)
