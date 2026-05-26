# ECUDeck — AI Chat / Review Architecture

> Detailed architecture for provider-backed chat workflows, mode semantics, proposal objects, review lifecycles, and safe apply behavior.

---

# Purpose

This document defines how AI-assisted chat and review should work in ECUDeck.

It exists to make the following explicit:

- how chat modes differ
- how model providers should be abstracted
- how AI requests should be grounded in workspace/project/session context
- how proposals should be structured
- how review and apply should work
- how safety boundaries should remain visible

This layer is where conversational interaction meets project mutation risk.

Because of that, it must be explicit, typed, and review-driven.

---

# AI Chat Mission

The AI chat layer should help the user:

- ask questions about loaded firmware and project context
- plan work before executing changes
- request guided actions
- review generated or proposed changes
- understand risks and relationships
- author plugins with assistance

The chat layer should make ECUDeck easier to use without turning it into an opaque “AI auto tuner.”

---

# Core Principle

AI output is proposal-oriented, not truth-oriented.

The system should treat AI as:

- assistant
- explainer
- planner
- proposal generator
- review participant

The system should NOT treat AI as:

- final authority
- silent mutator of project state
- replacement for deterministic parsing or validation

---

# Architectural Position

```text
User Intent
    ->
Chat Mode + Active Context
    ->
Frontend Chat Layer
    ->
Provider Abstraction Layer
    ->
Model Provider
    ->
Proposal / Explanation / Stream
    ->
Review Layer
    ->
Apply Through Command Bridge
```

This architecture keeps AI interaction connected to the rest of the ECUDeck platform instead of floating as a disconnected chatbot.

---

# Primary Interaction Surfaces

AI assistance should be embedded primarily where the user is already doing engineering work.

Primary surfaces should be:

- plugin editor copilot
- hex editor copilot
- map editor copilot

These should feel like contextual sidecars, docked panels, or editor-adjacent assistants.

They should NOT be treated as a generic home page chatbot or dashboard-first workflow.

A workspace or dashboard surface may still expose:

- provider status
- recent review history
- model configuration
- pending jobs

But the main AI working experience should stay attached to editor context, selections, and active engineering tasks.

---

# Supported Chat Modes

The AI system should support multiple explicit working modes.

## Ask

Purpose:

- answer questions
- explain firmware or plugin concepts
- clarify results and warnings

Characteristics:

- low autonomy
- explanation-focused
- should not imply mutation unless explicitly escalated

Examples:

- explain a map relationship
- describe a validation warning
- compare two likely interpretations

---

## Plan

Purpose:

- help the user think through steps before action
- break down analysis or authoring tasks
- describe tradeoffs and likely consequences

Characteristics:

- medium autonomy
- planning-focused
- can produce structured plans without applying anything

Examples:

- plan plugin authoring steps
- plan an analysis workflow for a newly loaded ECU
- plan a review strategy for several proposed changes

---

## Agent

Purpose:

- generate proposals
- orchestrate allowed actions through the command bridge
- help carry out multi-step tasks

Characteristics:

- highest autonomy among execution-oriented modes
- still bounded by explicit review and context
- should produce traceable actions

Examples:

- prepare plugin scaffolds
- request indexing and summarize results
- propose a multi-file review object

---

## Review

Purpose:

- inspect proposed changes
- explain what changed
- let the user accept or reject modifications

Characteristics:

- mutation-adjacent but explicitly gated
- structured diff and audit behavior
- human remains final authority

Examples:

- review AI-generated plugin edits
- review structured configuration changes
- review batch apply proposals tied to a session

---

# Context Model

AI interactions should never be context-free when project-sensitive actions are involved.

An AI request should be able to attach explicit context such as:

- workspace id
- project id
- session id
- firmware ids
- active editor surface
- selected map or viewport context
- selected hex region or binary range
- active plugin document or manifest scope
- active plugin reference set
- compressed session/context summaries when full raw context is too large
- current chat mode

The context layer should make it possible to answer:

- what was the AI looking at
- what part of the project did it affect
- what assumptions shaped its output

---

# Context Compression

Project-aware chat will eventually exceed practical provider context limits.

The AI layer should therefore support explicit context compression instead of relying only on naive truncation.

Context compression should be used to:

- preserve important session/project state when raw context is too large
- summarize prior chat turns, findings, warnings, and accepted decisions
- keep mode-relevant context available across long-running analysis or review sessions
- reduce provider token cost without hiding that summarization occurred

Compression should be able to operate on inputs such as:

- prior conversation turns
- workspace/project/session metadata
- firmware analysis summaries
- active editor selections or viewport summaries
- proposal/review history
- plugin validation and compatibility findings

Compressed context should remain structured enough to preserve:

- source references or provenance where possible
- unresolved assumptions
- safety-relevant warnings
- accepted versus rejected decisions
- freshness/version information for the summarized state

Important rules:

- compression should be explicit in the request pipeline, not an invisible side effect
- the system should prefer structured summaries over blind truncation
- lossy compression should be marked as lossy
- compressed context should be replaceable or refreshable when the underlying project state changes
- apply/review decisions should never rely on hidden context the user cannot inspect

The architecture should make it possible to distinguish between:

- raw attached context
- retrieved contextual artifacts
- compressed context snapshots prepared for provider submission

This allows long-running chat and review sessions to remain usable without pretending the provider saw the full original state.

---

# Provider Abstraction Layer

The frontend and command bridge should talk to a normalized provider layer instead of baking provider-specific behavior into feature logic.

Supported provider categories should include:

- local models via llama-server
- local models via Ollama
- external API providers

The provider layer should expose:

- provider id
- display name
- connection status
- capability metadata
- model list
- streaming behavior
- cancellation support

This allows the same chat and review UX to work across local and remote providers without fragmenting the operator experience.

---

# Provider Capability Model

Different providers may support different features.

The system should model capabilities explicitly, such as:

- text chat
- streaming output
- tool or action orchestration support
- structured JSON output
- long-context support
- local-only execution

The chat layer should adapt behavior based on declared capabilities instead of hard-coding assumptions for one provider family.

---

# Request Types

AI requests should not all look the same internally.

The system should distinguish between at least:

- explanation requests
- planning requests
- proposal-generation requests
- review/explanation requests
- plugin-authoring requests
- semantic reasoning requests

This helps:

- prompt shaping
- provider routing
- result typing
- review expectations

---

# Response Types

AI output should be normalized into explicit response categories.

Examples:

- explanatory answer
- structured plan
- proposal object
- streaming partial response
- review explanation
- provider error

The frontend should not guess what kind of object it received from arbitrary raw model text.

---

# Proposal Object Model

The most important bridge between AI and review is the proposal object.

A proposal object should represent possible changes in a structured, inspectable form.

Potential proposal object fields:

- proposal id
- mode
- source provider/model
- workspace/project/session context
- context snapshot or compression reference
- target artifact references
- explanation summary
- proposed changes
- risk notes
- compatibility notes
- review status

Proposal objects should be first-class architecture objects, not just chat transcript fragments.

---

# Review Object Model

A review object is the reviewable projection of one or more proposals.

A review object should be able to contain:

- file changes
- plugin metadata changes
- schema field changes
- map-related recommendations
- batch action sets
- rationale/explanations

A review object should also know:

- what produced it
- what it affects
- whether items are accepted, rejected, or pending

---

# Review Workflow

Recommended review flow:

```text
AI Request
    ->
Provider Output
    ->
Structured Proposal
    ->
Review Object
    ->
Accept / Reject Decisions
    ->
Validated Apply
```

The user should be able to:

- accept changes
- reject changes
- accept all
- reject all

Review should be explicit and visible before any meaningful project mutation occurs.

---

# Apply Boundary

Applying reviewed changes should happen through the command bridge, not directly inside the chat layer.

The chat layer may:

- generate proposals
- explain proposals
- help the user decide

The command bridge should:

- validate context
- apply accepted items
- emit result events

This separation keeps the AI layer advisory and the native layer authoritative for state mutation.

---

# Streaming Model

Many providers will stream partial output.

The chat architecture should support:

- token or chunk streaming
- partial answer rendering
- partial proposal previews when safe
- explicit completed/canceled/error states

Streaming state should remain transient until the system has enough structured output to form a stable proposal or answer object.

---

# Event Model

Important event families for this layer include:

- provider streaming events
- provider completion events
- provider cancellation events
- proposal created events
- review item updated events
- review applied/rejected events

These should integrate with the broader event-driven architecture rather than rely on broad polling loops.

---

# Safety Boundaries

The AI layer should preserve visible safety boundaries.

Important rules:

- no silent apply of project-changing actions
- no hidden escalation from Ask to Agent semantics
- no pretending that non-deterministic model output is deterministic core truth
- no bypass around plugin/runtime validation

If the model proposes a change, the system should make that fact visible.

---

# Auditability

Every meaningful AI-assisted proposal should be traceable.

At minimum, the system should be able to answer:

- which provider and model generated the output
- in which mode the request ran
- which project/session it applied to
- which raw or compressed context snapshot was used
- what was proposed
- what was accepted
- what was rejected

This is especially important for:

- plugin authoring
- reviewable project changes
- safety-adjacent analysis suggestions

---

# Plugin Editor Integration

The AI chat layer should integrate especially well with the plugin editor.

Important plugin-editor chat capabilities:

- explain required schema fields
- propose plugin scaffolds
- suggest compatibility fixes
- explain validation failures
- create reviewable plugin change proposals

The intended UX is a copilot-style assistant that stays attached to the active plugin editing surface.

It should understand:

- the current plugin document
- the active schema section
- validation output
- compatibility warnings
- recent accepted or rejected plugin proposals

The plugin editor should not implement its own disconnected AI system with different behavior than the main chat/review architecture.

---

# Map / Firmware Analysis Integration

The AI chat layer should also support firmware-facing analysis workflows such as:

- explaining detected maps
- reasoning about dependency chains
- summarizing indexing results
- comparing interpretation hypotheses
- preparing reviewable recommendations

These workflows should consume active session and firmware context rather than free-form detached prompts only.

The intended UX is a copilot-style assistant attached to:

- the active hex editor selection
- the active map view
- the active compare/diff context
- the active analysis session

This keeps AI suggestions grounded in what the operator is actually inspecting, instead of pushing firmware analysis into a detached landing-page workflow.

---

# UX Ownership

The frontend owns:

- mode switching
- context display
- streaming display
- proposal rendering
- review controls
- accept/reject interactions

The backend/provider layer owns:

- provider invocation
- structured proposal shaping assistance
- validation of apply boundaries
- event emission

This keeps the UI consistent while allowing provider backends to evolve.

---

# Error Model

AI/review errors should be structured enough that the UI can react appropriately.

Important categories include:

- provider unavailable
- provider capability mismatch
- request canceled
- invalid structured output
- proposal normalization failure
- review apply validation failure

The UI should clearly distinguish between:

- model/provider failure
- command bridge failure
- validation failure
- user rejection

---

# Persistence Model

Not all AI output should be persisted equally.

## Persisted

Should usually include:

- accepted/rejected review outcomes
- stable proposal objects tied to project/session history
- provider/model metadata relevant to accepted changes

---

## Transient

May remain transient:

- partial streams
- abandoned drafts
- temporary Ask-mode explanations unless explicitly saved

This prevents the system from turning all conversational noise into permanent project state.

---

# Testing Expectations

The AI chat/review layer should be tested at multiple levels.

## Frontend Tests

For:

- mode switching
- streaming UI behavior
- proposal rendering
- accept/reject controls
- review state updates

---

## Integration Tests

For:

- provider output normalization
- proposal-to-review transformation
- review apply workflows
- plugin authoring review flows

---

## Failure Tests

For:

- canceled requests
- malformed structured output
- provider disconnects
- apply validation rejection

---

# Boundary Rules

What belongs in this layer:

- mode semantics
- provider abstraction
- proposal objects
- review objects
- review UX logic
- auditability rules

What does NOT belong in this layer:

- deterministic parsing logic
- plugin runtime enforcement
- direct unchecked mutation of project state
- hidden provider-specific UX fragmentation

---

# Dependencies

This document should directly inform:

- frontend-level architecture
- Tauri command bridge architecture
- workspace/project/session architecture
- plugin system architecture
- job system architecture

---

# Core Philosophy

```text
The AI chat/review layer should make assistance contextual,
proposal-driven,
reviewable,
and safe to act upon.
```
