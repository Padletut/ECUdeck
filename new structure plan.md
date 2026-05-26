# ECUDeck — Semantic Architecture Plan

> AI-assisted ECU analysis, calibration consistency checking, and firmware tooling platform.

---

# Vision

ECUDeck should be a modern, modular, and semantic ECU platform built for:

* firmware analysis
* map discovery
* ECU plugin systems
* risk analysis
* AI-assisted remapping
* deterministic parsing
* native desktop performance

The goal is to combine:

* native Rust performance
* modern React UI
* AI/LLM assistance
* semantic ECU understanding
* open-source contributor friendliness

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

* GUI
* hex viewer
* graph visualization
* map editing
* project workflows
* AI interaction panels
* diagnostics
* live dependency visualization

---

## Desktop Shell

```text
Tauri
```

Responsibilities:

* native desktop integration
* filesystem access
* secure Rust command bridge
* cross-platform builds
* local project/workspace management

---

## Core Engine

```text
Rust
```

Responsibilities:

* BIN parsing
* checksum handling
* binary indexing
* map scanning
* dependency graph building
* semantic analysis
* consistency validation
* chunk streaming
* performance-critical systems

---

## AI Services

```text
Python
```

Responsibilities:

* ML pipelines
* GNN experimentation
* semantic relationship inference
* LLM-assisted reasoning
* calibration analysis
* AI-assisted diagnostics

---

## Documentation

```text
MkDocs
Material for MkDocs
```

Responsibilities:

* architecture documentation
* subsystem READMEs
* plugin contracts
* contributor documentation
* flow diagrams
* API references
* safety/disclaimer policies

---

# High-Level Architecture

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
│ ECUDeck Core (Rust)        │
│                            │
│ - Parser Engine            │
│ - Hex Engine               │
│ - Checksum Engine          │
│ - Map Scanner              │
│ - Semantic Graph           │
│ - Risk Engine              │
│ - Plugin Runtime           │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│ Python AI Services         │
│                            │
│ - ML                       │
│ - GNN                      │
│ - LLM Assistant            │
│ - Consistency Analysis     │
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

* consistency checking
* dependency analysis
* map relationship reasoning
* calibration diagnostics
* risk awareness
* semantic explanations

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
├── apps/
│   ├── desktop/
│   └── docs/
│
├── frontend/
│   ├── components/
│   ├── features/
│   ├── pages/
│   ├── graph/
│   ├── hexview/
│   └── shared/
│
├── core/
│   ├── parser/
│   ├── firmware/
│   ├── indexing/
│   ├── maps/
│   ├── graph/
│   ├── checksums/
│   ├── plugins/
│   ├── risk/
│   ├── export/
│   └── utils/
│
├── ai/
│   ├── ml/
│   ├── gnn/
│   ├── llm/
│   ├── pipelines/
│   └── datasets/
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
├── scripts/
│
├── docs/
│
└── mkdocs.yml
```

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

* contributor friendly
* modular
* deterministic
* well documented
* architecture-driven

The goal is to avoid:

```text
tribal knowledge spaghetti civilization
```

---

# Safety Philosophy

ECUDeck should have clear safety boundaries.

The AI systems should:

* assist
* explain
* warn
* analyze

Not:

* blindly generate tuning
* override safety constraints
* act as an authoritative source

---

# Long-Term Goals

## Planned Advanced Systems

* semantic ECU graph engine
* map relationship explorer
* GNN-assisted dependency inference
* turbo efficiency modeling
* sensor constraint analysis
* automatic limiter relationship detection
* calibration diff engine
* live consistency validation
* AI calibration copilot

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
