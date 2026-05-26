# Rust Performance

This guide covers benchmarking and performance validation for Rust code in ECUDeck.

## Performance Philosophy

Rust exists in ECUDeck partly to give us deterministic, inspectable performance for binary-heavy workloads.

Performance work should focus on:

- parsing
- indexing
- chunk generation
- graph construction
- validation passes
- checksum-related operations

## Benchmark Tools

Use:

- `criterion` for statistically solid benchmark suites
- `divan` for lightweight, developer-friendly microbenchmarks

## When to Use Criterion

Prefer `criterion` when:

- comparing algorithm variants
- measuring regressions over time
- benchmarking realistic fixture-based workflows
- collecting more careful statistical results

## When to Use Divan

Prefer `divan` when:

- exploring tight inner loops
- iterating quickly on micro-optimizations
- validating smaller performance hypotheses

## Benchmark Rules

- benchmark realistic binary sizes when possible
- document fixture assumptions
- avoid benchmarking debug-only logging noise
- keep benchmark inputs deterministic
- separate parse speed from I/O speed unless the benchmark intentionally covers both

## Regression Mindset

Performance changes should be treated like correctness changes.

If a change materially affects speed, memory behavior, or latency, record it and explain why.
