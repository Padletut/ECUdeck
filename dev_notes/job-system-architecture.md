# ECUDeck — Job System Architecture

> Detailed architecture for background execution, job lifecycle, ownership, progress reporting, cancellation, and diagnostics integration.

---

# Purpose

This document defines how the ECUDeck job system should work as the execution backbone for long-running operations.

It exists to make the following explicit:

- what qualifies as a job
- how jobs are created and owned
- how job state changes over time
- how progress should be reported
- how cancellation and retry should work
- how frontend diagnostics should observe and control jobs

The job system is critical because ECUDeck will increasingly depend on expensive operations that cannot block the operator experience.

---

# Job System Mission

The job system should make long-running work:

- visible
- cancelable where safe
- traceable
- attributable to project/session context
- event-driven
- resilient to partial failure

The job system should prevent ECUDeck from becoming a collection of hidden background work with unclear ownership.

---

# What Counts as a Job

Not every operation needs to become a job.

Jobs should be used for work that is:

- meaningfully long-running
- asynchronous by nature
- resource-intensive
- user-observable
- cancelable or retryable

Examples:

- firmware indexing
- semantic graph generation
- plugin validation when expensive
- large scanning passes
- AI-backed analysis that takes noticeable time

Simple, quick reads do not need full job semantics.

---

# Architectural Position

```text
User Action
    ->
Frontend Request
    ->
Command Bridge
    ->
Job Creation
    ->
Rust Job Runtime
    ->
Progress / State Events
    ->
Frontend Diagnostics + Result Attachment
```

The job system should be the structured execution layer beneath the command bridge, not just an implementation detail hidden inside random services.

---

# Core Capabilities

The job system should support:

- job queue
- task runtime
- background analysis
- cancelable tasks
- progress reporting
- result attachment
- retry support

These capabilities should exist as intentional architecture, not ad hoc convenience behavior.

---

# Job Ownership Model

Every job should belong to an explicit ownership context.

Recommended ownership levels:

- workspace-owned jobs
- project-owned jobs
- session-owned jobs

## Workspace-Owned Jobs

Examples:

- workspace-wide scans
- startup cache refresh
- global maintenance tasks

---

## Project-Owned Jobs

Examples:

- multi-firmware indexing for a project
- project-level plugin resolution
- project-wide artifact refresh

---

## Session-Owned Jobs

Examples:

- graph generation for an active analysis session
- review-related background validation
- AI-assisted session analysis

The system should always be able to answer:

- what job is running
- why it exists
- what it belongs to
- where its results should attach

---

# Job Identity

Each job should have a stable identity.

Suggested job metadata:

- job id
- job type
- ownership context
- creation timestamp
- current status
- progress state
- cancelability
- retryability

This identity should be stable enough for both frontend diagnostics and persisted audit trails where needed.

---

# Job Lifecycle

Recommended lifecycle:

```text
Created
    ->
Queued
    ->
Started
    ->
Running
    ->
Completed
```

Possible alternate terminal or transitional states:

- failed
- canceled
- retrying
- paused (optional future state)

The system should avoid vague “maybe running” states.

---

## Created

The job has been defined but not yet accepted into the runtime queue.

---

## Queued

The job is accepted and waiting for execution resources.

---

## Started

The runtime has begun execution and can emit progress.

---

## Running

The job is actively performing work and may emit progress updates, warnings, or intermediate state.

---

## Completed

The job finished successfully and attached or returned results.

---

## Failed

The job ended unsuccessfully with a structured error.

The system should preserve enough failure information for:

- diagnostics
- retry decisions
- user-facing explanation

---

## Canceled

The job was explicitly stopped.

Cancellation should be visible and should not look like a silent failure.

---

# Queue Model

The queue should be explicit, not implicit.

The system should be able to manage:

- queued jobs
- active jobs
- completed jobs
- failed jobs

Important queue behaviors:

- scheduling policy should be deterministic enough to reason about
- ownership context should be preserved
- queue visibility should be available to the frontend

The exact runtime implementation can evolve, but the user-visible model should stay stable.

---

# Scheduling Principles

The scheduler should consider:

- task type
- resource intensity
- ownership context
- cancellation risk
- whether a newer job supersedes an older one

Examples:

- a repeated viewport-related request may supersede stale work
- a heavy indexing pass may remain unique and non-duplicated

The job system should avoid unnecessary duplicated heavy work where possible.

---

# Progress Model

Progress should be structured and meaningful.

Progress should not only be a vague percentage if richer state is available.

A progress update may include:

- percentage or fraction
- current phase
- message
- timestamps
- estimated remaining scope when possible

Examples of phases:

- reading
- parsing
- indexing
- scanning
- linking
- validating
- exporting

This helps the frontend show real status instead of a fake spinner with no context.

---

# Event Model

The job system should be strongly event-driven.

Important job event types:

- job created
- job queued
- job started
- job progress
- job warning
- job completed
- job failed
- job canceled
- job retried

These events should be emitted through the command bridge/native event layer for frontend diagnostics and state synchronization.

---

# Cancellation Model

Cancellation should be supported where safe and meaningful.

Important rules:

- cancellation capability must be explicit
- not every job must be cancelable
- cancellation should preserve state consistency
- cancellation should never leave project/session state half-committed without clarity

Good cancellation candidates:

- AI/provider-backed analysis requests
- large scans
- graph generation
- long indexing runs where safe checkpoints exist

Poor cancellation candidates:

- tiny operations that complete immediately
- critical commit/apply sections unless rollback is well defined

---

# Retry Model

Some failed or canceled jobs should be retryable.

Retry should be explicit and traceable.

A retried job should:

- know which earlier job it relates to
- preserve relevant context
- avoid silently duplicating side effects

Retry is especially useful for:

- transient provider failures
- validation retries after user correction
- file access or resource issues that can be resolved

---

# Result Attachment

Jobs should not finish into a void.

A completed job should know how results attach to:

- workspace state
- project state
- session state
- review objects
- plugin references

Examples:

- indexing job attaches index artifacts to a session or project
- review validation job attaches findings to a review proposal
- plugin validation job attaches compatibility output to the plugin editor context

---

# Diagnostics Integration

The frontend diagnostics layer should expose job information clearly.

The user should be able to see:

- active jobs
- queued jobs
- failed jobs
- recent completed jobs
- warnings and failure reasons
- cancel / retry affordances

The diagnostics layer should not need to invent job meaning after the fact.

The job system should provide enough structure for the UI to display it naturally.

---

# Relationship to the Workspace Model

The job system should integrate directly with the workspace/project/session architecture.

Recommended rule:

- jobs are always anchored to a meaningful ownership scope
- results attach back to that scope
- diagnostics can filter jobs by scope

This prevents the system from turning into a flat global task list detached from actual work context.

---

# Relationship to the Command Bridge

The command bridge should expose job lifecycle operations such as:

- start job-backed action
- query job state
- cancel job
- retry job

The command bridge should also emit job events so the frontend does not need to poll broad state repeatedly.

The bridge should not hide job creation for meaningful long-running operations.

If work is important enough to take time, it is important enough to model as a visible job.

---

# Relationship to Rust Core

The Rust core should own the real execution of job-backed domain work.

The job system should coordinate execution for:

- parser tasks
- indexing tasks
- graph tasks
- validation tasks
- export tasks
- plugin runtime tasks where expensive

The Rust core and job runtime should cooperate without collapsing all domain logic into the job layer itself.

The job system schedules and tracks work.
It does not replace subsystem semantics.

---

# AI / Provider Jobs

Provider-backed work should integrate cleanly into the same job model where latency or cost justifies it.

Examples:

- semantic analysis requests
- plugin authoring proposals
- long-context review generation

These jobs should surface:

- provider/model metadata
- streaming or partial progress state
- cancellation status
- final proposal attachment

This keeps AI work visible and auditable instead of feeling magical or detached.

---

# Review-Related Jobs

Some review operations may also be job-backed.

Examples:

- validating a batch of accepted changes
- computing structured diffs for large proposals
- rebuilding derived artifacts before apply

These jobs should attach their results to review objects and preserve project/session ownership.

---

# Error Model

Job errors should be structured enough to support:

- user-facing failure explanation
- diagnostics filtering
- retry logic
- testing

Important job error categories:

- invalid context
- missing inputs
- I/O failure
- provider failure
- validation failure
- canceled operation
- unsupported operation

The frontend should not have to guess whether a job failed due to user cancellation, provider disconnect, or validation rejection.

---

# Persistence Model

Not all job data should be persisted equally.

## Persisted

May include:

- meaningful completed job records
- failure summaries
- job-result attachments
- audit-relevant job metadata

---

## Transient

May include:

- short-lived progress updates
- ephemeral queued state
- streaming intermediate messages

The system should retain enough information for user understanding without turning every micro-event into permanent storage noise.

---

# Concurrency Rules

The system should define whether jobs may run:

- serially
- in bounded parallelism
- by task class

The important rule is that concurrency should remain explainable.

Examples:

- multiple lightweight reads may be parallel
- conflicting export/apply tasks may need serialization
- duplicated heavy scans may need de-duplication or supersession rules

---

# Testing Expectations

The job system should be tested for:

- lifecycle correctness
- progress emission
- cancellation behavior
- retry behavior
- ownership attachment
- result attachment
- diagnostics-facing event correctness

High-value tests include:

- start -> progress -> complete flows
- failure-path tests
- cancellation tests
- scope ownership tests
- job supersession or duplicate-prevention tests

---

# Boundary Rules

What belongs in the job system:

- lifecycle management
- scheduling
- progress reporting
- cancellation and retry
- ownership and result attachment
- event emission

What does NOT belong in the job system:

- full parser semantics
- plugin contract definitions
- UI-specific rendering decisions
- hidden mutation outside explicit ownership and review boundaries

---

# Dependencies

This document should directly inform:

- workspace/project/session architecture
- Tauri command bridge architecture
- Rust core architecture
- AI chat/review architecture
- frontend-level architecture

---

# Core Philosophy

```text
The job system should make background work visible,
owned,
cancelable,
and safe to build workflows around.
```
