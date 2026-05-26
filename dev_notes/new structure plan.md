# ECUDeck — Semantic Architecture Plan

> AI-assisted ECU analysis, calibration consistency checking, and firmware tooling platform.

---

# Vision

ECUDeck should be a modern, modular, and semantic ECU platform built for:

- firmware analysis
- map discovery
- ECU plugin systems
- user-friendly plugin editing
- risk analysis
- AI-assisted remapping
- AI-assisted ECU plugin authoring
- deterministic parsing
- native desktop performance

The goal is to combine:

- native Rust performance
- modern React UI
- AI/LLM assistance
- semantic ECU understanding
- open-source contributor friendliness

---

# Core Technology Stack

## Frontend

```text
React
Vite
TailwindCSS
shadcn/ui
```

Responsibilities:

- GUI
- hex viewer
- graph visualization
- map editing
- plugin editor
- workspace/project navigation
- analysis session management
- project workflows
- AI interaction panels
- chat workflows
- change review panels
- diagnostics
- live dependency visualization

---

## Desktop Shell

```text
Tauri
```

Responsibilities:

- native desktop integration
- filesystem access
- secure Rust command bridge
- cross-platform builds
- local project/workspace management

---

## Core Engine

```text
Rust
```

Responsibilities:

- BIN parsing
- checksum handling
- binary indexing
- map scanning
- dependency graph building
- semantic analysis
- consistency validation
- chunk streaming
- background task orchestration
- performance-critical systems

---

## Model Integration

```text
Rust
Provider APIs
```

Responsibilities:

- local model integration via llama-server
- local model integration via Ollama
- external model API integration
- LLM-assisted reasoning
- AI-assisted diagnostics
- AI-assisted plugin generation
- reviewable AI workflows

---

## Documentation

```text
MkDocs
Material for MkDocs
```

Responsibilities:

- architecture documentation
- subsystem READMEs
- plugin contracts
- contributor documentation
- flow diagrams
- API references
- safety/disclaimer policies

---

# High-Level Architecture

Detailed frontend architecture is described in:

[`frontend-level-architecture.md`](./frontend-level-architecture.md)

```text
┌────────────────────────────┐
│ React + Vite Frontend      │
│ Tailwind + shadcn/ui       │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ Tauri Desktop Shell        │
│ Rust Command Bridge        │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│ Workspace / Project Layer  │
│                            │
│ - Workspaces               │
│ - Projects                 │
│ - Session State            │
│ - Plugin References        │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│ ECUDeck Core (Rust)        │
│                            │
│ - Parser Engine            │
│ - Hex Engine               │
│ - Checksum Engine          │
│ - Map Scanner              │
│ - Semantic Graph           │
│ - Risk Engine              │
│ - Plugin Runtime           │
│ - Job System               │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│ Model Provider Layer       │
│                            │
│ - llama-server             │
│ - Ollama                   │
│ - External APIs            │
│ - Reviewable AI Actions    │
└────────────────────────────┘
```

---

# Firmware Processing Pipeline

```text
BIN Load
    ->
File Validation
    ->
ECU Detection
    ->
Architecture Identification
    ->
Binary Indexing
    ->
Map Discovery
    ->
Reference Linking
    ->
Semantic Graph Construction
    ->
Consistency Analysis
    ->
Risk Evaluation
    ->
Patch Export
```

---

# Workspace / Project Layer

ECUDeck should evolve around an explicit engineering workspace model, not just a single-file workflow.

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

This model should make it possible to organize multiple firmware targets, retain analysis history, associate plugin knowledge with projects, and manage derived artifacts as part of a longer-running engineering workflow.

ECUDeck should feel more like:

```text
engineering workspace
```

than:

```text
single file tool
```

---

# Job System / Background Tasks

ECUDeck will likely need a dedicated job system as analysis features become more advanced and more time-consuming.

Core capabilities should include:

- job queue
- task runtime
- background analysis
- cancelable tasks
- progress reporting

This becomes especially important for:

- AI analysis
- graph generation
- firmware indexing
- large-scale scans

Long-running work should not block the UI, and the user should always be able to see what is running, what completed, what failed, and what can be canceled or retried.

---

# AI-Assisted Calibration Philosophy

ECUDeck should NOT be:

```text
"AI auto tuner"
```

ECUDeck should be:

```text
AI-assisted calibration analysis platform
```

AI is used for:

- consistency checking
- dependency analysis
- map relationship reasoning
- calibration diagnostics
- risk awareness
- semantic explanations
- plugin authoring assistance

Not as a:

```text
source-of-truth calibration engine
```

---

# Semantic Dependency Model

Example of semantic links:

```text
Driver Wish
    ->
Torque Limiter
    ->
Smoke Limiter
    ->
Boost Target
    ->
Turbo Efficiency
    ->
EGT Risk
```

Or:

```text
IQ Request
    ->
Airflow Requirement
    ->
Lambda Constraint
    ->
Smoke Threshold
```

---

# Example AI Consistency Warnings

```text
Requested IQ exceeds airflow-supported smoke threshold.

Expected:
- excessive soot
- elevated EGT
- reduced turbo efficiency
```

---

```text
Boost target exceeds compressor efficiency island.

Potential:
- turbo overspeed
- elevated intake temperature
- reduced efficiency
```

---

```text
Rail pressure request exceeds expected injector duration window.
```

---

# Repository Structure

```text
ecudeck/
│
├── src/
│   ├── features/
│   ├── layout/
│   ├── pages/
│   └── styles/
│
├── core/
│   ├── parser/
│   ├── firmware/
│   ├── indexing/
│   ├── projects/
│   ├── maps/
│   ├── graph/
│   ├── jobs/
│   ├── checksums/
│   ├── plugins/
│   ├── risk/
│   ├── sessions/
│   ├── export/
│   └── utils/
│
├── plugins/
│   ├── edc15/
│   ├── edc16/
│   ├── med9/
│   └── shared/
│
├── fixtures/
│   ├── sample_bins/
│   ├── test_vectors/
│   └── checksum_cases/
│
├── legacy/
│   └── python_backend/
│
├── docs/
│
├── src-tauri/
│   ├── src/
│   ├── Cargo.toml
│   └── tauri.conf.json
│
└── mkdocs.yml
```

During migration, legacy Python parsing code may remain available for reference, but it should not define the long-term architecture.

---

# README Philosophy

Each subsystem directory should have:

```text
README.md
```

with:

```text
Purpose
Responsibilities
What belongs here
What does NOT belong here
Inputs / Outputs
Public interfaces
Flow diagrams
Failure modes
Invariants
Examples
```

---

# Plugin Architecture

Each ECU plugin should implement clear contracts.

ECUDeck should include a user-friendly plugin editor so users can create, inspect, and refine ECU plugins without needing to work directly in raw source files for every step.

The plugin editor should include an AI/LLM assistance mode that helps the user design, scaffold, explain, and improve ECU plugins while keeping the user in control of the final result.

Plugin contracts should be versioned from the beginning so the ecosystem can evolve without breaking every contributor integration.

Examples:

- Plugin API v1
- Plugin Schema v2
- Compatibility layers

The goal is to avoid:

```text
plugin apocalypse civilization
```

when contributors, schemas, and runtime behavior evolve over time.

Example:

```rust
trait ECUPlugin {
    fn detect();
    fn parse_metadata();
    fn find_maps();
    fn validate();
    fn export_patch();
}
```

---

# AI/LLM Interaction Modes

The AI/LLM assistant should support multiple working modes inside the chat and plugin editor:

- Ask
- Plan
- Agent
- Review

These modes should support different levels of autonomy, from answering questions to proposing changes, performing guided actions, and reviewing generated or modified plugin logic.

Model access should support:

- local models via llama-server
- local models via Ollama
- external model APIs

The system should treat model access as a pluggable provider layer so local and remote backends can be swapped without changing the user experience.

---

# Review Workflow

The chat should support a review mode where proposed changes can be inspected before they are applied.

The user should be able to:

- accept changes
- reject changes
- accept all
- reject all

Review should be explicit, reversible where possible, and designed to keep the human operator as the final authority over plugin and project modifications.

---

# Hex Viewer Philosophy

The frontend should NOT render entire BIN files.

Instead:

```text
Rust Core
    ->
Chunk Streaming
    ->
Virtualized Frontend Renderer
```

The frontend shows only the:

```text
visible viewport
```

for maximum performance.

---

# Open Source Philosophy

ECUDeck should be:

- contributor friendly
- modular
- deterministic
- well documented
- architecture-driven

The goal is to avoid:

```text
tribal knowledge spaghetti civilization
```

---

# Safety Philosophy

ECUDeck should have clear safety boundaries.

The AI systems should:

- assist
- explain
- warn
- analyze

Not:

- blindly generate tuning
- override safety constraints
- act as an authoritative source

---

# Long-Term Goals

## Planned Advanced Systems

- semantic ECU graph engine
- map relationship explorer
- GNN-assisted dependency inference
- turbo efficiency modeling
- sensor constraint analysis
- automatic limiter relationship detection
- calibration diff engine
- live consistency validation
- AI calibration copilot

---

# Future Identity

ECUDeck should feel more like:

```text
WinOLS + IDA Pro + AI Assistant
```

than:

```text
web SaaS dashboard
```

ECUDeck is fundamentally more of a:

```text
analysis + remapping + semantic reasoning platform
```

not a:

```text
flashing/logging suite
```

---

# Architectural Principles

## Deterministic First

```text
Deterministic extraction before AI reasoning
```

---

## Native Performance

```text
Rust handles heavy binary workloads
```

---

## Semantic Understanding

```text
Firmware is treated as interconnected systems,
not isolated maps.
```

---

## Modular Boundaries

```text
Subsystem ownership must stay explicit.
```

---

## Documentation as Architecture

```text
Architecture must live inside the repository.
```

---

# Documentation Stack

Documentation system:

```text
MkDocs
+
Material for MkDocs
```

Recommended sections:

```text
Architecture
Subsystems
Plugin Development
Core Concepts
Firmware Pipeline
AI Systems
Safety Model
Contribution Guide
Testing
Roadmap
```

---

# ECUDeck Core Philosophy

```text
Firmware analysis should become understandable,
traceable,
semantic,
and safer.
```
