# ECUDeck — Tauri Command Bridge Architecture

> Detailed architecture for the typed bridge between the React frontend and the Rust/native execution layer.

---

# Purpose

This document defines how the frontend should communicate with native capabilities through Tauri.

It exists to make the following explicit:

- what belongs in the command bridge
- what does not belong there
- how commands should be structured
- how events should be emitted
- how background jobs should report progress
- how chunked firmware access should work
- how reviewable changes should be applied safely

This bridge is one of the most important architectural boundaries in ECUDeck.

It sits between:

- operator-facing workflows
- workspace/project/session state
- Rust core systems
- model/provider integrations

---

# Architectural Position

```text
React Component
    ->
Feature Hook / Action
    ->
Frontend Service Wrapper
    ->
Tauri Command Bridge
    ->
Rust Core / Native Services
```

The frontend should never scatter raw native calls throughout components.

All communication should flow through stable, typed frontend service wrappers and stable native contracts.

---

# Command Bridge Mission

The command bridge should be responsible for:

- translating typed frontend requests into native operations
- validating command inputs at the boundary
- returning structured results
- emitting progress and lifecycle events
- preserving ownership and traceability across long-running work

The command bridge should NOT become:

- the home of parsing algorithms
- the home of checksum logic
- the home of semantic reasoning
- a dumping ground for miscellaneous business logic

Those belong in deeper Rust subsystems.

The bridge is a boundary and coordinator, not the core engine itself.

---

# Core Design Goals

## Typed Contracts

Every command and event should have a stable, explicit shape.

Avoid:

- loosely shaped payloads
- stringly typed command arguments
- unstructured success/error blobs

---

## Frontend Simplicity

The frontend should call strongly named service methods such as:

- `openWorkspace()`
- `loadFirmwareMetadata()`
- `requestBinaryChunk()`
- `startIndexingJob()`
- `applyReviewedChanges()`

The frontend should not care whether the underlying transport is Tauri invoke, event emission, or future adapter changes.

---

## Explicit Ownership

Every command should know the context it belongs to when relevant:

- workspace
- project
- firmware scope
- session
- plugin references
- review object

This keeps native actions traceable and reduces detached state mutations.

---

## Event-Driven Background Work

Long-running operations should not rely on blocking request/response semantics alone.

They should emit structured events for:

- queued
- started
- progress changed
- completed
- failed
- canceled

---

## Review Safety

Commands that mutate meaningful project state should support reviewable workflows where appropriate.

This is especially important for:

- plugin generation
- AI-proposed edits
- structured apply actions
- batch change acceptance

---

# Bridge Layers

The command bridge should be thought of as multiple layers rather than one flat invoke surface.

## 1. Frontend Service Layer

Lives in the frontend.

Responsibilities:

- exposes ergonomic methods to React features
- normalizes errors
- maps raw transport details into app-level types
- centralizes event subscription logic

Example areas:

- workspace service
- firmware service
- jobs service
- plugin service
- review service
- ai service

---

## 2. Tauri Command Layer

Lives in the native shell boundary.

Responsibilities:

- receives typed requests
- validates context
- dispatches to Rust subsystems
- returns structured responses

This layer should stay thin.

---

## 3. Native Event Layer

Responsibilities:

- emits progress updates
- emits completion/failure notifications
- emits streaming output where relevant
- synchronizes long-running operations with the frontend

---

## 4. Rust Core Service Layer

Responsibilities:

- executes parsing, indexing, validation, graph, and review-apply logic
- owns deterministic domain behavior
- returns structured outputs to the bridge

---

# Command Categories

The bridge should group commands by responsibility.

## Workspace Commands

Examples:

- create workspace
- open workspace
- list projects
- create project
- update project metadata
- load project summary

These commands define the persistent working context.

---

## Firmware Commands

Examples:

- attach firmware file
- load firmware metadata
- request firmware summary
- request binary chunk
- create compare pairing

These commands should treat firmware artifacts as first-class project records.

---

## Session Commands

Examples:

- create analysis session
- resume analysis session
- close session
- branch session
- load session context

These commands should preserve operator continuity across restarts and resumed work.

---

## Job Commands

Examples:

- start indexing job
- start semantic analysis job
- cancel job
- retry job
- query job state

Job commands should be paired with event-driven progress reporting.

---

## Plugin Commands

Examples:

- validate plugin
- load plugin schema
- generate plugin scaffold
- resolve plugin references
- apply plugin edits

Plugin commands should surface version and compatibility data explicitly.

---

## Review Commands

Examples:

- create review proposal
- list pending review items
- accept change
- reject change
- accept all
- reject all
- apply reviewed changes

Review commands should never hide what changed.

---

## AI / Provider Commands

Examples:

- list providers
- query provider capabilities
- prepare context snapshot
- refresh context snapshot
- send chat request
- cancel model request
- request plugin authoring proposal
- request semantic explanation

Provider-specific behavior should stay normalized behind stable bridge contracts.

The bridge should treat context compression as a first-class typed operation rather than a hidden provider implementation detail.

---

# Context Compression Contract

When raw project/session/chat context exceeds practical provider limits, the bridge should support explicit context snapshot preparation.

A snapshot preparation request should be able to include:

- workspace/project/session ownership ids
- active AI mode
- source artifact references
- requested token budget or compression policy
- whether lossy compression is allowed

A snapshot preparation response should be able to include:

- context snapshot id
- summarized context payload
- source references included in the snapshot
- lossiness and freshness metadata
- token budget estimates when available

This allows frontend UX, provider requests, and later review/apply flows to agree on the exact compressed context artifact being used.

---

# Request / Response Contract Principles

Every bridge command should define:

- request shape
- required ids and context
- success response shape
- error response shape
- whether the command is synchronous-like or job-backed

Recommended command contract shape:

```text
Command Name
Request
Response
Possible Errors
Event Side Effects
```

This makes commands documentable and testable.

---

# Context Propagation Rules

When a command depends on project state, it should not rely on hidden global assumptions.

It should receive explicit identifiers such as:

- workspace id
- project id
- session id
- firmware ids
- plugin reference ids
- review proposal id
- context snapshot id when compressed context shaped the request

This is especially important for:

- AI requests
- review apply operations
- job creation
- plugin validation

---

# Event Model

The bridge should expose a structured event model.

Recommended event families:

- workspace events
- project events
- session events
- job events
- context events
- review events
- provider events

## Job Events

At minimum, job events should include:

- job queued
- job started
- job progress
- job completed
- job failed
- job canceled

## Review Events

At minimum, review events should include:

- review proposal created
- review item updated
- review applied
- review rejected

## Context Events

At minimum, context events should include:

- context snapshot created
- context snapshot refreshed
- context snapshot invalidated
- context compression failed

## Provider Events

At minimum, provider events should include:

- streaming token/output chunk
- provider error
- provider completed
- provider canceled

---

# Chunk Streaming Contract

Firmware access is one of the most important bridge responsibilities.

The frontend should not request or hold full BIN render payloads when only a viewport-sized region is needed.

Recommended access model:

```text
Frontend Viewport Request
    ->
requestBinaryChunk()
    ->
Rust chunk retrieval
    ->
structured chunk response
```

Chunk responses should include enough metadata to make them safe and useful.

Examples:

- firmware id
- offset
- length
- actual returned range
- encoding or view hints when relevant

The contract should be robust against:

- out-of-range requests
- stale session context
- file detachment

---

# Job Bridge Model

Long-running operations should not pretend to be instant.

Recommended flow:

```text
Frontend starts job
    ->
Native layer returns job id
    ->
Rust executes work
    ->
progress events emitted
    ->
completion/failure event emitted
```

This model should be used for:

- indexing
- graph generation
- plugin validation when expensive
- AI-backed analysis that takes meaningful time
- large scan operations

The frontend should always know:

- what job id was created
- what entity owns it
- whether it can be canceled

---

# Review Apply Contract

Applying reviewed changes is high-risk and should have a stricter contract than casual reads.

Recommended apply flow:

```text
Review Proposal
    ->
User Accepts Specific Items
    ->
applyReviewedChanges()
    ->
Native validation
    ->
project/session mutation
    ->
review result event
```

Apply commands should include:

- target project/session
- review proposal id
- accepted item ids
- originating context snapshot id when relevant
- optional batch mode

They should return:

- applied results
- skipped items
- validation failures
- resulting artifact references when applicable

---

# Error Model

Bridge errors should be structured, not opaque.

At minimum, errors should be distinguishable across categories such as:

- invalid context
- missing entity
- stale context snapshot
- validation failure
- I/O failure
- provider failure
- unsupported operation
- canceled operation

The frontend should be able to display meaningful messages without reverse-engineering arbitrary native error strings.

---

# Security and Validation Rules

The bridge should validate all boundary inputs before handing them deeper into domain logic.

Important validation areas:

- path access and workspace boundaries
- entity ownership checks
- review/apply authorization rules
- command payload shape
- chunk range validation

Native access should be powerful, but not casual.

The bridge should make sensitive operations deliberate and auditable.

---

# Versioning Strategy

The command bridge is effectively a contract surface.

Even if the app is local-first, versioning discipline still matters.

Public bridge contracts should evolve carefully when they affect:

- frontend service wrappers
- stored review objects
- plugin flows
- provider integrations

If a contract changes meaningfully, the change should be documented like any other public API evolution.

---

# Recommended Frontend Mapping

The frontend should likely centralize bridge access under paths like:

```text
src/services/tauri/
src/services/commands/
src/services/adapters/
```

Recommended pattern:

- React components call feature actions or hooks
- hooks call service wrappers
- service wrappers call native commands
- event subscriptions are centralized

This avoids duplicate transport logic and keeps testing easier.

---

# Recommended Native Mapping

On the native side, keep bridge entry points separate from deep domain logic.

Conceptually:

```text
src-tauri/
    commands/
    events/
    adapters/
    app_state/
    rust_core_integration/
```

The exact file layout can evolve, but command-handling concerns should remain distinct from parser and engine internals.

---

# Testing Expectations

The command bridge should be tested for:

- request validation
- error shaping
- event emission behavior
- job lifecycle correctness
- review apply safety
- chunk request correctness

High-value test categories:

- frontend wrapper tests
- native command integration tests
- event contract tests
- failure-path tests

---

# Boundary Rules

What belongs in the command bridge:

- typed command entry points
- typed event emission
- context validation
- orchestration and dispatch
- contract normalization

What does NOT belong in the command bridge:

- full parser implementations
- raw business logic accumulation
- provider-specific UI rules
- long-lived domain ownership confusion

---

# Dependencies

This document should directly inform:

- frontend-level architecture
- workspace/project/session architecture
- job system architecture
- plugin system architecture
- AI chat/review architecture
- Rust core architecture

---

# Core Philosophy

```text
The command bridge should make native power predictable,
typed,
traceable,
and safe to build upon.
```
