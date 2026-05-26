# Testing

This guide defines testing practices and testing levels for ECUDeck.

## Goals

Testing should protect:

- deterministic parsing behavior
- stable command contracts
- safe review flows
- editor correctness
- regression-prone performance paths

## Frontend Testing

Current frontend-oriented tooling includes:

- Jest
- Testing Library
- Playwright

Recommended split:

- unit tests for utilities and small state helpers
- component tests for editor and review surfaces
- end-to-end tests for workspace flows

## Rust Testing

Rust code should rely on:

- unit tests for parsing logic and small components
- integration tests for subsystem behavior
- fixture-based tests for binary formats
- benchmarks for performance-sensitive paths

## Python Testing

If Python is used for experiments or tools, prefer lightweight, isolated tests and avoid making Python test infrastructure a hidden dependency of the main product.

## Fixture Discipline

Fixtures should be:

- representative
- documented
- safe to redistribute
- small enough for normal CI use when possible

## High-Risk Areas

Add tests aggressively around:

- parsing correctness
- checksum behavior
- plugin validation
- map diff logic
- review apply/reject flows
- background job state transitions

## Required Validation Before Shipping

At minimum, changes should be validated with the relevant subset of:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Rust test and check commands when native code changes
