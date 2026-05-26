# ECUDeck — Frontend-Level Architecture

> Detailed React + Vite architecture for the ECUDeck desktop workspace.

---

# Purpose

This document defines how the frontend should be structured beyond the high-level platform diagram.

It focuses on:

- feature boundaries
- UI ownership
- state separation
- Tauri/Rust integration
- chat and review workflows
- performance constraints
- frontend folder strategy

The frontend is not just a page renderer.

It is the operator workspace for:

- firmware exploration
- map editing
- plugin authoring
- semantic reasoning
- reviewable AI-assisted changes
- job monitoring

---

# Frontend Mission

The frontend should feel like a native engineering workspace, not a thin web dashboard.

It should optimize for:

- fast navigation between projects and sessions
- low-friction firmware inspection
- safe review of AI-proposed changes
- clear visualization of dependencies and risk
- predictable interaction patterns across tools

The frontend should be responsible for user experience, orchestration, and visualization.

The frontend should NOT be responsible for:

- full BIN parsing
- checksum logic
- semantic inference engines
- heavy indexing
- authoritative calibration decisions

Those responsibilities belong to Rust core services and model/provider integrations.

---

# Architectural Position

```text
App Shell
    ->
Workspace Layer
    ->
Feature Modules
    ->
Frontend State + View Models
    ->
Tauri Command Bridge
    ->
Rust Core / Model Providers
```

The frontend should sit between the operator and the underlying engines.

It translates:

- user intent
- navigation context
- review decisions
- editor interactions

into typed commands, queries, and visual state.

---

# Primary Frontend Areas

## 1. App Shell

Responsibilities:

- top-level layout
- navigation chrome
- command palette
- global status indicators
- active project/session context
- notifications and alerts

The app shell should stay thin and stable.

It should not contain feature-specific business logic.

---

## 2. Workspace Layer

Responsibilities:

- workspace picker
- project list
- firmware file inventory
- analysis session switching
- plugin reference linking

This layer should make ECUDeck feel like:

```text
engineering workspace
```

and not:

```text
single file uploader
```

---

## 3. Firmware Exploration Layer

Responsibilities:

- firmware metadata view
- binary summary panels
- indexing progress
- symbol/map discovery summaries
- semantic dependency entry points

This layer should help the user understand what is loaded before they start editing.

---

## 4. Map Editing Layer

Responsibilities:

- hex viewer
- 2D map view
- 3D map view
- compare/diff tools
- selection-aware editing panels
- patch preview

This layer should remain highly responsive and viewport-driven.

The frontend should only render visible data ranges and should rely on chunked data delivery from Rust.

---

## 5. Plugin Editor Layer

Responsibilities:

- plugin metadata editing
- schema-driven forms
- contract/version visibility
- generated code previews
- plugin validation output
- AI-assisted plugin authoring mode

The plugin editor should support both structured editing and raw-source inspection, but the primary UX should favor guided, user-friendly authoring.

---

## 6. AI Chat Layer

Responsibilities:

- conversational interaction
- context selection
- context snapshot inspection
- context compression visibility
- mode switching
- proposal rendering
- inline citations/explanations
- review handoff

Supported chat modes:

- Ask
- Plan
- Agent
- Review

The chat layer should be context-aware and able to work against:

- active project
- active firmware
- active map
- active plugin
- active analysis session
- compressed context snapshots when full raw context is too large

When long-running chat or review sessions exceed practical provider limits, the frontend should make context compression visible.

The operator should be able to see whether the active request is using raw attached context or a compressed snapshot, and whether that snapshot is fresh, stale, or lossy.

---

## 7. Review Layer

Responsibilities:

- proposed change previews
- structured diff presentation
- accept/reject controls
- accept all / reject all workflows
- auditability of what was proposed vs applied

No AI-generated edit should silently mutate project state without a visible review boundary.

---

## 8. Diagnostics and Job Layer

Responsibilities:

- job queue visibility
- background task progress
- cancel / retry actions
- logs and warnings
- failure explanation

This layer becomes critical once indexing, graph generation, plugin validation, and AI analysis become long-running operations.

---

# Target Frontend Structure

This is the recommended target structure for the frontend over time:

```text
src/
│
├── app/
│   ├── App.tsx
│   ├── providers/
│   └── router/
│
├── layout/
│   ├── shell/
│   ├── navigation/
│   ├── panels/
│   └── statusbar/
│
├── features/
│   ├── workspace/
│   ├── firmware/
│   ├── map-editor/
│   ├── plugin-editor/
│   ├── ai-chat/
│   ├── review/
│   ├── diagnostics/
│   └── graph/
│
├── entities/
│   ├── project/
│   ├── firmware/
│   ├── session/
│   ├── plugin/
│   └── job/
│
├── shared/
│   ├── ui/
│   ├── forms/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── constants/
│
├── state/
│   ├── workspace/
│   ├── sessions/
│   ├── jobs/
│   ├── chat/
│   └── review/
│
├── services/
│   ├── tauri/
│   ├── commands/
│   ├── providers/
│   └── adapters/
│
└── styles/
```

Migration note:

The current repository can grow into this structure incrementally.
It does not need to match this layout all at once.

---

# State Model

The frontend should separate state by purpose.

## UI State

Examples:

- open panels
- active tab
- sidebar visibility
- modal/dialog state
- transient selections

UI state should stay local whenever possible.

---

## Workspace State

Examples:

- current workspace
- selected project
- active firmware file
- linked plugin references

This state should be shared across multiple features.

---

## Session State

Examples:

- active analysis session
- active comparison context
- currently selected map
- current editor cursor/viewport context

Session state should be durable enough to restore meaningful operator context.

---

## AI Chat State

Examples:

- active chat mode
- selected provider/model
- active conversation thread
- pending raw context attachments
- current context snapshot reference
- compression freshness/lossiness indicators
- streaming request lifecycle

AI chat state should keep raw attachments separate from prepared context snapshots so the UI can show what will actually be sent to the provider.

---

## Job State

Examples:

- queued jobs
- running jobs
- progress values
- completion/failure status

This state should be event-driven and updated from backend task notifications.

---

## Review State

Examples:

- proposed file changes
- map diffs
- plugin edits
- pending accept/reject decisions

Review state should be isolated from committed project state until the user approves it.

---

# Tauri / Rust Integration Boundary

The frontend should communicate with the native layer through typed service wrappers, not ad hoc calls scattered across components.

Recommended flow:

```text
React Component
    ->
Feature Action / Hook
    ->
Frontend Service
    ->
Tauri Command
    ->
Rust Core
```

Examples of commands the frontend may invoke:

- open workspace
- load firmware metadata
- request binary chunk
- start indexing job
- validate plugin
- apply reviewed changes

Components should not know transport details.

They should only depend on stable frontend service contracts.

---

# Model Provider Integration

The frontend should not directly encode provider-specific behavior in feature views.

Instead, it should talk to a normalized provider layer that exposes:

- available providers
- model selection
- connection status
- capability metadata
- streaming response events

This allows the same chat and plugin workflows to operate across:

- llama-server
- Ollama
- external API providers

without fragmenting the UI into provider-specific screens.

---

# Context Compression UX

The frontend should treat context compression as an inspectable part of the chat workflow, not as hidden prompt plumbing.

It should be able to display:

- raw context selected by the user
- retrieved project/session artifacts
- the active compressed context snapshot prepared for provider submission
- freshness or invalidation state
- whether compression was lossy
- which session, proposal, or review flow the snapshot belongs to

For high-impact requests, especially Agent and Review mode, the operator should be able to refresh or replace stale compressed context before continuing.

This keeps long-running chat sessions usable without silently drifting away from the visible engineering state.

---

# Reviewable AI Workflow

The frontend should treat AI output as proposals, not immediate truth.

Recommended flow:

```text
User Request
    ->
Context Snapshot Preparation
    ->
AI Analysis / Proposal
    ->
Structured Review Object
    ->
Diff / Explanation UI
    ->
Accept or Reject
    ->
Apply Through Command Bridge
```

Review objects should support:

- human-readable explanations
- file-level changes
- field-level changes
- plugin contract changes
- context snapshot references when compression shaped the request
- batch accept/reject actions

This is especially important in:

- plugin authoring
- map adjustments
- generated configuration
- semantic explanation workflows with actionable outputs

---

# Navigation Model

The frontend should support multi-panel, tool-oriented navigation rather than simple page-to-page browsing.

A likely navigation model is:

```text
Workspace
    ->
Project
    ->
Firmware
    ->
Tool Surface
        -> Overview
        -> Hex
        -> 2D
        -> 3D
        -> Graph
        -> Plugin
        -> Chat
        -> Review
        -> Diagnostics
```

The important design principle is that tools should share context instead of forcing the user to re-open or re-select the same data repeatedly.

---

# Performance Principles

## Chunked Data, Never Full Rendering

Large firmware data should be streamed or paged into the frontend.

The frontend should never attempt to render entire BIN files at once.

---

## Feature Isolation

Heavy surfaces such as graph views, 3D views, and chat panels should be isolated so they do not cause unnecessary re-renders across the whole workspace.

---

## Event-Driven Background Updates

Job progress, logs, provider responses, and review proposals should update through explicit events rather than broad polling-based redraws.

---

## Predictable State Ownership

State should live as close to its real owner as possible.

Avoid turning the entire frontend into a single global state bucket.

---

# Design System Direction

The frontend should maintain a consistent operator-facing visual language.

Recommended design characteristics:

- information-dense but readable
- dark industrial tone without becoming muddy
- clear risk and warning color semantics
- strong distinction between read-only, editable, generated, and reviewed states
- typography that separates metadata, binary views, and semantic explanations

The design system should provide reusable primitives for:

- panels
- split views
- inspectors
- diff blocks
- command bars
- review cards
- status badges
- progress surfaces

---

# Testing Strategy

Frontend testing should be split by level.

## Unit Tests

For:

- formatters
- view-model adapters
- small hooks
- review-state reducers

---

## Component Tests

For:

- editor panels
- review cards
- job views
- chat mode switching

---

## Integration Tests

For:

- workspace-to-editor flows
- plugin authoring flows
- review/accept/reject flows
- job progress behavior

---

# Frontend Boundaries

What belongs in the frontend:

- interaction design
- view composition
- state orchestration
- review UX
- command invocation
- contextual visualization

What does NOT belong in the frontend:

- authoritative parsing engines
- binary checksum engines
- large semantic graph computation
- provider-specific model business logic
- final safety decisions for calibration logic

---

# Suggested Implementation Phases

## Phase 1

- stabilize app shell
- stabilize workspace navigation
- preserve existing map editor surfaces
- establish typed Tauri command wrappers

---

## Phase 2

- add job center
- add project/session persistence UX
- add chat mode framework
- add review object rendering

---

## Phase 3

- add plugin editor workflows
- add semantic graph surfaces
- add provider selection and model health UI
- add deeper diagnostics and traceability views

---

# Core Frontend Philosophy

```text
The frontend should make complex firmware work understandable,
structured,
reviewable,
and fast.
```
