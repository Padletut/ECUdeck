# Developer Guide

This section collects the working rules for building ECUDeck as a desktop-first engineering workspace.

Use these guides when you are:

- setting up a machine for development
- making architectural changes
- adding frontend or Rust features
- touching plugin contracts
- writing docs or release notes
- validating performance-sensitive Rust changes

## Guide Map

- [Environment Setup](./environment-setup.md)
- [Design Principles](./design-principles.md)
- [Coding Standards](./coding-standards.md)
- [Rust](./rust.md)
- [Python](./python.md)
- [Testing](./testing.md)
- [Documentation](./documentation.md)
- [Releases](./releases.md)
- [Plugins](./plugins.md)
- [Rust Performance](./rust-performance.md)
- [FFI Memory Contract](./ffi-memory-contract.md)

## Project Direction

ECUDeck is being built around:

- React + Vite for the operator-facing frontend
- Tauri for the desktop shell
- Rust for parsing, indexing, validation, jobs, and performance-critical systems
- MkDocs for repository-native documentation

Python may still exist during migration, but it is not the primary long-term runtime architecture.
