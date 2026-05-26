# ECUDeck — Workspace / Project / Session Architecture

> Detailed architecture for the engineering workspace model that sits between the frontend shell and the core analysis systems.

---

# Purpose

This document defines the primary working model for ECUDeck as an engineering workspace.

It exists to make the following explicit:

- what a workspace is
- what a project is
- how firmware files are organized
- what an analysis session represents
- how plugin references attach to project context
- what should be persisted vs what should remain transient

This model is foundational for:

- frontend navigation
- active context management
- background job ownership
- AI chat context
- review/apply workflows
- plugin authoring context

---

# Core Model

```text
Workspace
    ->
Projects
    ->
Firmware Files
    ->
Analysis Sessions
    ->
Plugin References
```

This is not just a display hierarchy.

It is the primary ownership model for how work is organized, resumed, reviewed, and exported.

---

# Design Goal

ECUDeck should behave like:

```text
engineering workspace
```

not:

```text
single file tool
```

The user should be able to return to a project later and still understand:

- what firmware files belong there
- what was analyzed
- what sessions were created
- what plugin knowledge was used
- what review decisions were made

---

# Primary Entities

## Workspace

A workspace is the top-level container for related ECUDeck work.

Responsibilities:

- groups projects together
- defines the local root for project storage
- provides a stable place for user work over time
- acts as the highest-level navigation and persistence boundary

A workspace should represent a real working environment, not a temporary file-open dialog state.

Examples:

- a personal tuning workspace
- a workshop engineering workspace
- a research/reverse-engineering workspace

---

## Project

A project is the main working unit inside a workspace.

Responsibilities:

- groups one or more firmware files around a shared goal
- stores project-specific notes, metadata, and references
- owns analysis sessions and review history
- owns plugin references relevant to that project

A project should usually represent one real engineering problem space.

Examples:

- one vehicle build
- one ECU family investigation
- one calibration comparison effort
- one plugin development effort for a target ECU class

---

## Firmware File

A firmware file is a binary or related artifact associated with a project.

Responsibilities:

- identifies a concrete input or derived artifact
- stores metadata about source, type, checksum, and origin
- acts as the input root for analysis sessions

Firmware files may include:

- original binaries
- modified binaries
- reference binaries
- compare targets
- derived patch artifacts

Firmware files should be first-class records in the project model, not anonymous blobs.

---

## Analysis Session

An analysis session is a scoped working context created from one or more firmware files inside a project.

Responsibilities:

- captures the active analysis context
- tracks selections, discovered maps, and active comparisons
- records AI/review interactions relevant to that session
- owns session-scoped jobs and derived temporary state

An analysis session is not just a timestamp.

It should represent a meaningful unit of operator work.

Examples:

- initial indexing and discovery session
- compare session between original and modified binaries
- plugin-assisted metadata recovery session
- semantic graph investigation session

---

## Plugin Reference

A plugin reference connects project or session work to plugin knowledge.

Responsibilities:

- records which plugin definitions were used
- tracks plugin version or contract version
- links plugin output or assumptions to project/session context
- supports reproducibility and later review

Plugin references should make it possible to answer:

- which plugin influenced this analysis
- which version was used
- whether the result was generated, inferred, or manually adjusted

---

# Relationship Rules

## Workspace -> Project

- one workspace owns many projects
- a project belongs to exactly one workspace

---

## Project -> Firmware File

- one project may own many firmware files
- a firmware file belongs to exactly one project

---

## Project -> Analysis Session

- one project may contain many analysis sessions
- an analysis session belongs to exactly one project

---

## Firmware File -> Analysis Session

- one analysis session may reference one or more firmware files
- one firmware file may participate in multiple analysis sessions

This is important because the same binary may be used in:

- initial exploration
- comparison
- plugin validation
- AI review workflows

---

## Project / Session -> Plugin Reference

- plugin references should usually be project-scoped
- sessions may additionally attach or snapshot the specific plugin references they used

This keeps plugin knowledge reusable at the project level while preserving historical traceability at the session level.

---

# Persistence Model

The model should distinguish between persisted, derived, and transient state.

## Persisted State

Persisted state should survive application restarts.

Examples:

- workspace definitions
- project metadata
- firmware inventory records
- saved analysis sessions
- plugin references
- review outcomes

---

## Derived State

Derived state can be recomputed from persisted inputs.

Examples:

- parsed metadata caches
- semantic graph caches
- indexed offsets
- temporary map summaries

Derived state may be stored for performance, but should not be treated as the only source of truth.

---

## Transient State

Transient state belongs to the active UI/runtime and does not need to survive every restart unless explicitly promoted.

Examples:

- open tabs
- current panel widths
- hover state
- in-progress unsaved selection state
- partial chat streaming output before commit

---

# Active Context Model

At runtime, the frontend and backend should be able to agree on an active working context.

Recommended active context shape:

```text
Active Workspace
Active Project
Active Firmware Set
Active Analysis Session
Active Plugin References
```

This context should be stable enough that all major tools can consume it:

- map editor
- graph explorer
- plugin editor
- AI chat
- review surfaces
- diagnostics

The user should not have to repeatedly re-select the same project context for each tool surface.

---

# Session Lifecycle

Recommended lifecycle:

```text
Create Project
    ->
Attach Firmware Files
    ->
Start Analysis Session
    ->
Run Jobs / Inspect / Edit / Review
    ->
Save Outcomes
    ->
Resume or Branch Later
```

An analysis session may be:

- created fresh
- resumed
- duplicated/branched
- closed
- archived

Branching becomes useful when the user wants to explore different interpretations without mutating the original session trail.

---

# Job Ownership

Jobs should attach to explicit workspace/project/session ownership.

Recommended rule:

- global app jobs belong to the workspace layer
- project analysis jobs belong to a project
- deep analysis and review jobs belong to an analysis session

This makes it easier to answer:

- what is running
- why it is running
- where results should be attached
- what can be canceled safely

---

# Review Ownership

Review objects should be attached to project and session context, not left floating as generic chat output.

Each reviewable proposal should know:

- which project it belongs to
- which session produced it
- which firmware files it affects
- which plugin references influenced it
- whether it was accepted, rejected, or left pending

This is necessary for auditability and later traceability.

---

# AI Context Ownership

AI-assisted workflows should be grounded in explicit context.

An AI request should be able to state:

- workspace
- project
- firmware scope
- session scope
- plugin scope
- review mode

Without this, AI assistance quickly becomes detached from the actual engineering state of the project.

---

# Recommended Repository-Level Mapping

The exact storage format can evolve, but the conceptual mapping should be close to this:

```text
workspace/
    projects/
        project-a/
            firmware/
            sessions/
            plugin-references/
            reviews/
            exports/
```

This does not have to be exposed directly to the user as raw folders, but the ownership model should stay recognizable.

---

# Suggested Metadata Responsibilities

## Workspace Metadata

Should include:

- workspace id
- display name
- local root path
- creation/update timestamps

---

## Project Metadata

Should include:

- project id
- display name
- description/notes
- target vehicle or ECU hints when known
- project status
- creation/update timestamps

---

## Firmware Metadata

Should include:

- firmware id
- file path or artifact reference
- checksum/hash
- file size
- source classification
- origin notes

---

## Session Metadata

Should include:

- session id
- project id
- firmware scope
- creation/update timestamps
- purpose or label
- status

---

## Plugin Reference Metadata

Should include:

- plugin id
- plugin version
- contract/schema version
- confidence or validation notes when relevant

---

# Boundary Rules

What belongs in this layer:

- ownership hierarchy
- persistence identity
- active context
- traceability rules
- review and job attachment

What does NOT belong in this layer:

- detailed parser implementation
- checksum algorithms
- graph computation internals
- provider-specific AI protocol logic

Those belong in deeper subsystem architecture documents.

---

# Open Architectural Rules

These rules should remain stable even as implementation evolves:

- every session must belong to a project
- every firmware artifact must belong to a project
- active tool surfaces should consume shared project/session context
- plugin usage should be traceable
- review actions should attach to durable project/session ownership
- long-running jobs should have explicit ownership

---

# Suggested Next Dependencies

This document should directly inform:

- Tauri command bridge architecture
- frontend state architecture
- job system architecture
- plugin system architecture
- AI chat/review architecture

---

# Core Philosophy

```text
The workspace model should make ECUDeck work feel persistent,
structured,
traceable,
and resumable.
```
