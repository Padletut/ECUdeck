# ECUDeck — Rust Core Architecture

> Detailed architecture for the Rust-first core that powers parsing, indexing, validation, jobs, and performance-critical workflows.

---

# Purpose

This document defines the long-term structure of the ECUDeck Rust core.

It exists to make the following explicit:

- what belongs in the Rust core
- how the core should be decomposed into subsystems
- how crates or modules should be separated
- how data should flow from raw firmware to derived insights
- how the core interacts with the command bridge, workspace model, and plugin/runtime layers

The Rust core is the execution backbone of ECUDeck.

It is where deterministic, performance-sensitive, and safety-relevant logic should live.

---

# Core Mission

The Rust core should be responsible for:

- BIN parsing
- binary indexing
- checksum handling
- map discovery
- semantic dependency construction
- consistency validation
- risk-oriented analysis support
- chunked binary access
- structured editor-context artifacts for AI-assisted workflows
- plugin execution/runtime behavior
- background task execution

The Rust core should NOT become:

- a UI orchestration layer
- a place for transport-specific frontend logic
- a provider-specific chat UX layer
- an unstructured collection of one-off helpers with no ownership boundaries

---

# Architectural Position

```text
Workspace / Project / Session Context
    ->
Tauri Command Bridge
    ->
Rust Core Entry Points
    ->
Core Subsystems
    ->
Derived Results / Jobs / Reviewable Outputs
```

The Rust core should accept explicit context and deterministic inputs, then produce structured outputs for the rest of the system.

---

# High-Level Core Subsystems

The Rust core should be organized around stable responsibility boundaries.

## Parser

Responsibilities:

- load raw binary sources
- identify file shape and layout assumptions
- decode low-level binary structures
- expose deterministic metadata extraction

The parser should focus on correctness first.

---

## Firmware

Responsibilities:

- represent loaded firmware artifacts
- normalize binary identity and metadata
- expose a stable domain model for firmware-related operations

This subsystem should define what a firmware artifact means inside ECUDeck.

---

## Indexing

Responsibilities:

- build efficient binary lookup structures
- support offset discovery and region summaries
- provide reusable indices for maps, references, and scans

This layer exists to reduce repeated deep scans and support performant downstream operations.

---

## Maps

Responsibilities:

- map discovery
- map metadata normalization
- axis/value region interpretation
- map relationship hints

This subsystem should expose map-oriented domain objects rather than raw offset lists only.

---

## Checksums

Responsibilities:

- detect checksum-relevant regions
- validate expected checksum state
- prepare checksum-aware export behavior

Checksum behavior should remain explicit and deterministic.

---

## Graph

Responsibilities:

- semantic dependency representation
- relationship linking
- graph-oriented traversal and query support
- consistency reasoning support inputs

This layer should model firmware relationships as connected systems, not isolated tables.

---

## Risk

Responsibilities:

- rule-based consistency checks
- constraint violation detection
- explainable risk signals
- safety-oriented warnings

The risk subsystem should support operator understanding, not pretend to be an autonomous source of truth.

---

## Plugins

Responsibilities:

- plugin loading and validation
- plugin contract compatibility
- plugin-assisted detection and metadata extraction
- plugin runtime dispatch

This layer should keep plugin behavior explicit, versioned, and testable.

---

## Jobs

Responsibilities:

- queue execution
- task lifecycle management
- progress reporting hooks
- cancellation support
- ownership binding to workspace/project/session context

This is the execution layer for long-running work, not just a utility thread pool.

---

## Export

Responsibilities:

- produce patch or derived artifact outputs
- preserve artifact metadata
- coordinate checksum-aware export steps
- expose reviewable export results

---

# Recommended Core Layout

Conceptually, the core should move toward something like:

```text
core/
│
├── firmware/
├── parser/
├── indexing/
├── maps/
├── checksums/
├── graph/
├── risk/
├── plugins/
├── jobs/
├── export/
├── projects/
├── sessions/
└── utils/
```

This may begin as modules in one crate and later evolve into multiple crates when boundaries become stable enough to justify it.

---

# Crate Strategy

The project should not split into many crates too early without reason.

Recommended strategy:

## Phase 1

Use one main Rust core crate with clear internal modules.

Why:

- easier refactoring
- easier boundary discovery
- less ceremony during early architectural change

---

## Phase 2

Split into focused crates when one or more of these become true:

- subsystem boundaries are stable
- compile times become painful
- plugin/runtime APIs need clearer isolation
- benchmarkable core libraries need reuse outside the Tauri shell

Potential future crates:

- `ecudeck_firmware`
- `ecudeck_parser`
- `ecudeck_indexing`
- `ecudeck_graph`
- `ecudeck_plugins`
- `ecudeck_jobs`
- `ecudeck_export`

The exact names can change, but the responsibility boundaries should remain recognizable.

---

# Domain Model Responsibilities

The Rust core should define intentional domain types instead of pushing raw loosely typed structures everywhere.

Examples of core domain concepts:

- firmware artifact
- firmware identity
- map candidate
- validated map
- checksum state
- graph node
- graph relationship
- risk finding
- plugin reference
- analysis job
- export artifact

These types should be meaningful enough that the rest of the stack can reason about them consistently.

---

# Data Flow Model

The core data flow should remain understandable and layered.

Recommended flow:

```text
Binary Input
    ->
Firmware Representation
    ->
Parsing
    ->
Indexing
    ->
Map Discovery
    ->
Graph Linking
    ->
Consistency / Risk Analysis
    ->
Reviewable Outputs / Export
```

This does not mean everything must happen at once.

It means the core should be able to support these stages without collapsing all logic into one giant pass.

---

# Binary Access Model

One of the most important responsibilities of the Rust core is safe, efficient binary access.

The core should support:

- chunk retrieval by offset and length
- efficient repeated reads
- stable metadata summaries
- derived region access for maps and related structures

The frontend should depend on this for viewport-based rendering and should not try to own binary traversal logic itself.

---

# AI Context Support Boundary

The Rust core should support AI-assisted editor workflows by producing deterministic context artifacts for copilot surfaces.

The main target surfaces are:

- plugin editor
- hex editor
- map editor

The core should be able to provide or derive artifacts such as:

- selected binary range summaries
- viewport-aware map context
- map candidate metadata snapshots
- plugin manifest and validation snapshots
- graph and risk summaries
- structured inputs that can later be compressed for provider submission

This allows the AI layer to stay grounded in real engineering context without turning the Rust core into a chat UX system.

The Rust core should NOT own:

- home page AI experiences
- provider-specific prompt orchestration
- chat mode UX
- accept/reject UI behavior

Its role is to provide deterministic, explainable context building blocks for the command bridge and frontend copilot surfaces.

---

# Job Ownership Model

Jobs in the Rust core should be attached to explicit ownership context.

Recommended ownership levels:

- workspace-owned jobs
- project-owned jobs
- session-owned jobs

The job subsystem should know enough context to answer:

- what is this job doing
- what object owns it
- where should the result attach
- whether it can be canceled or resumed

---

# Plugin Runtime Boundary

The plugin subsystem should not be allowed to blur every domain boundary.

Plugins may assist with:

- detection
- metadata parsing
- map identification
- validation rules
- export behavior

But plugin behavior should still pass through stable core domain contracts.

The core should remain the authority for:

- plugin compatibility checks
- plugin contract enforcement
- runtime validation

---

# Graph and Risk Relationship

The graph subsystem and the risk subsystem should remain separate even though they are closely related.

Recommended rule:

- graph builds the semantic relationship model
- risk consumes graph and deterministic rules to produce findings

This separation helps:

- testing
- explainability
- future rule iteration
- performance profiling

---

# Export Boundary

Export logic should be the final stage of a validated pipeline, not a casual side effect of editing.

Recommended export assumptions:

- exports know source firmware context
- exports know review/apply context when relevant
- exports know checksum state
- exports produce explicit artifact metadata

The export layer should make it possible to explain exactly what was produced and why.

---

# Error Model

The Rust core should use structured errors with enough context to support:

- frontend messaging
- command bridge normalization
- debugging
- test assertions

Prefer:

- typed error enums
- contextual error wrapping
- boundary-safe serialization

Avoid:

- raw string-only failure control flow
- silent fallback behavior in critical paths

---

# Determinism Rules

The Rust core should preserve deterministic behavior wherever possible.

This means:

- same inputs should produce the same deterministic core outputs
- derived caches should not silently change semantic meaning
- plugin effects should be traceable
- non-deterministic AI/provider behavior should not be confused with deterministic parsing or validation

This boundary is critical for safety and trust.

---

# Persistence and Derived Data

The Rust core should distinguish clearly between:

- source inputs
- persisted project/session state
- derived caches
- exported artifacts

Derived outputs such as indexes or graph caches may be persisted for performance, but the system should know they are derived and rebuildable.

---

# Interaction with the Command Bridge

The command bridge should expose the Rust core through stable entry points, but it should not leak internal module structure directly into frontend-facing contracts.

Recommended rule:

- frontend sees stable service contracts
- bridge sees stable command-level contracts
- Rust core remains free to refactor internal subsystems as long as public behavior remains stable

This protects the core from UI-driven architecture drift.

---

# Interaction with the Workspace Model

The Rust core should not treat firmware operations as detached file utilities.

Core operations should be able to run against explicit:

- workspace context
- project context
- session context
- plugin context

This supports traceability, job ownership, and later review/audit behavior.

---

# Recommended Internal Boundaries

Good internal rules:

- parser should not own UI-facing review logic
- jobs should not own firmware semantics
- graph should not own checksum logic
- plugins should not redefine core identity rules
- export should not be the hidden place where validation first occurs

If a subsystem starts quietly owning responsibilities from several other subsystems, its boundary should be reconsidered.

---

# Testing Expectations

The Rust core should be tested at multiple levels.

## Unit Tests

For:

- parsing helpers
- deterministic transforms
- validation rules
- graph utilities
- checksum calculations

---

## Integration Tests

For:

- end-to-end parsing and indexing flows
- plugin-assisted workflows
- export pipelines
- job lifecycle behavior

---

## Fixture Tests

For:

- known firmware variants
- checksum cases
- map discovery edge cases
- plugin compatibility behavior

---

## Benchmarking

For:

- parsing
- indexing
- chunk retrieval
- graph construction
- validation passes

See also:

- `criterion`
- `divan`

---

# Evolution Strategy

The Rust core should evolve toward clearer boundaries over time, not toward a bigger anonymous blob.

Good growth looks like:

- stronger domain types
- better subsystem separation
- more explicit contracts
- improved benchmarkability
- more predictable review and export behavior

Bad growth looks like:

- everything routed through one mega-module
- plugin rules hidden in random parsing code
- transport concerns leaking into core logic
- session/workspace ownership being ignored

---

# Dependencies

This document should directly inform:

- Tauri command bridge architecture
- workspace/project/session architecture
- plugin system architecture
- job system architecture
- AI chat/review architecture

---

# Core Philosophy

```text
The Rust core should make firmware work deterministic,
structured,
traceable,
and fast.
```
