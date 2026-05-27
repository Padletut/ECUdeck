# ECUDeck — Plugin Editor Architecture

> Detailed architecture for guided plugin authoring, firmware-linked detection workflows, and editor-bound AI copilot behavior.

---

# Purpose

This document defines how the Plugin Editor should work as a first-class engineering surface inside ECUDeck.

It exists to make the following explicit:

- how plugin authoring should feel in the UI
- how plugin definitions should be tested against firmware context
- how data, map, single-value, and checksum detection workflows should be represented
- how the copilot chat should assist without becoming an unreviewed auto-authoring system
- how plugin edits should stay reviewable, traceable, and validation-driven

The Plugin Editor is not just a manifest editor.

It is the authoring workspace for target-specific analysis logic.

---

# Plugin Editor Mission

The Plugin Editor should help the user:

- create plugins without having to hand-author every file
- define detection behavior against real firmware samples
- describe map-finding heuristics
- declare single-value and scalar extraction rules
- define checksum-aware behaviors
- validate compatibility and schema conformance
- use AI assistance to accelerate authoring while keeping final control

The editor should feel like:

```text
guided engineering workspace
```

and not:

```text
JSON form generator plus random chatbot
```

---

# Architectural Position

```text
Workspace / Project / Session
    ->
Active Plugin Reference or Plugin Draft
    ->
Plugin Editor Surface
    ->
Validation + Copilot + Review
    ->
Tauri Command Bridge
    ->
Rust Plugin Runtime / Detection Services
```

The Plugin Editor sits between project intent and deterministic plugin runtime behavior.

It should let the user shape plugin logic while constantly exposing:

- what the plugin means
- what the plugin matches
- what evidence supports a rule
- what still needs review

---

# Core UX Principle

The primary UX should be guided and user-friendly.

Raw source access may exist, but the default editor should favor:

- structured forms
- visual rule builders
- firmware-backed previews
- validation panels
- reviewable AI proposals

The user should not need to reverse-engineer the plugin contract every time they want to add:

- ECU detection logic
- map discovery rules
- a single extracted value
- a checksum-related rule

---

# Primary Editor Surfaces

## 1. Plugin Outline

Responsibilities:

- show plugin document structure
- navigate capabilities
- expose manifest sections
- jump to validation issues
- jump to AI proposals affecting a section

This should behave like a document outline, not just a flat form index.

---

## 2. Metadata / Contract Surface

Responsibilities:

- plugin identity
- supported ECU families
- plugin API version
- plugin schema version
- runtime compatibility declaration
- declared capabilities

This surface should make contract versioning visible at all times.

---

## 3. Detection Workbench

Responsibilities:

- attach one or more firmware samples
- preview plugin-assisted target detection
- define signatures, markers, and match rules
- expose confidence and evidence

This area should support workflows such as:

- detect likely ECU family
- detect platform identifiers
- detect known metadata regions
- compare multiple firmware samples for stable markers

The editor should make it easy to move from:

```text
observed pattern
    ->
candidate detection rule
    ->
validated plugin rule
```

---

## 4. Map Discovery Workbench

Responsibilities:

- define map-finding heuristics
- preview likely map candidates
- define axis expectations
- define value-region assumptions
- attach names, hints, and confidence notes

This workbench should support both:

- user-authored rules
- AI-suggested candidate rules

The user should be able to inspect why something was considered a map candidate before promoting it into plugin logic.

---

## 5. Single Value / Scalar Workbench

Responsibilities:

- define rules for single values
- capture address/range expectations
- describe scaling or interpretation hints
- link values to metadata or map context where appropriate

This matters because many useful plugin outputs are not full maps.

The editor should support scalar extraction as a first-class plugin concern.

---

## 6. Checksum / Export Workbench

Responsibilities:

- define checksum-related rules
- describe checksum regions or algorithms
- declare export-sensitive behaviors
- connect checksum expectations to patch/export workflows

This surface should help the user distinguish between:

- analysis-only plugin behavior
- mutation-sensitive plugin behavior

---

## 7. Validation / Compatibility Surface

Responsibilities:

- schema validation
- contract validation
- compatibility warnings
- missing capability warnings
- runtime support status

Validation output should stay visible while the user edits.

The user should not have to leave the editor to understand why a plugin is invalid.

---

## 8. Copilot Chat Dock

Responsibilities:

- answer authoring questions
- explain plugin rules
- propose detection logic
- suggest map/single-value/checksum rules
- prepare reviewable edits

The copilot should be a docked editor-side assistant, not a detached chat page.

---

# Plugin Editor Data Model

Conceptually, the editor should work with document-level structures such as:

- `PluginDocument`
- `PluginCapabilityDraft`
- `DetectionRuleDraft`
- `MapLocatorDraft`
- `SingleValueRuleDraft`
- `ChecksumRuleDraft`
- `ValidationSnapshot`
- `PluginEditProposal`

These do not all need to be literal serialized files.

But the editor architecture should treat them as distinct concepts.

---

# Sample Firmware Integration

The Plugin Editor should be able to attach sample firmware for authoring and testing.

Important use cases:

- test whether detection logic matches the right target
- test map-finding heuristics
- test single-value extraction
- test checksum rule interpretation
- compare rule behavior across multiple firmware variants

The editor should not rely on guesswork alone when sample evidence can be shown.

---

# Copilot Chat Role

The Plugin Editor should include a copilot chat bound to the active plugin context.

It should understand:

- the current plugin document
- active capability section
- selected detection rule or draft
- active firmware sample
- selected binary region if present
- current validation failures
- accepted and rejected prior proposals

The copilot should help with tasks such as:

- detecting likely data regions
- identifying map candidates
- identifying likely single values
- suggesting checksum regions or rules
- explaining why a rule failed validation
- proposing edits to improve compatibility
- scaffolding new plugin sections

---

# Copilot Modes Inside Plugin Editor

The Plugin Editor copilot should support:

- `Ask`
- `Plan`
- `Agent`
- `Review`

Expected meaning in this editor:

- `Ask`: explain the active plugin, rule, or firmware evidence
- `Plan`: break down how to author or fix a plugin capability
- `Agent`: propose structured plugin edits or analysis jobs
- `Review`: inspect pending plugin change proposals before apply

The Plugin Editor should not invent its own incompatible AI interaction model.

It should inherit the shared ECUDeck chat/review semantics.

---

# Copilot Proposal Types

Plugin-editor copilot output should be structured into proposal shapes such as:

- metadata field proposal
- capability declaration proposal
- detection rule proposal
- map locator proposal
- single value rule proposal
- checksum rule proposal
- validation fix proposal
- source/manifest patch proposal

Each proposal should include:

- affected plugin section
- reasoning summary
- supporting context refs when available
- confidence or uncertainty notes
- review status

---

# Review Workflow

Plugin Editor changes should remain review-gated.

Recommended flow:

```text
User Intent
    ->
Copilot Proposal or Manual Draft
    ->
Validation Preview
    ->
Review Object
    ->
Accept / Reject / Accept All / Reject All
    ->
Validated Apply
```

This applies especially to:

- AI-suggested detection rules
- AI-suggested map candidates
- AI-suggested checksum behavior
- generated manifest or source edits

---

# Command Bridge Surface

The Plugin Editor will likely need commands such as:

- load plugin document
- create plugin draft
- validate plugin draft
- preview detection against firmware sample
- preview map discovery against firmware sample
- preview single-value extraction
- preview checksum-related rules
- generate copilot-backed plugin proposals
- apply accepted plugin edits

These commands should return structured results, not opaque blobs.

---

# Job Integration

Some plugin-editor workflows should run as background jobs.

Examples:

- firmware scanning for candidate maps
- scalar/single-value detection passes
- sample comparison jobs
- checksum analysis previews
- provider-backed AI proposal generation

The editor should show:

- job status
- progress
- cancelation
- resulting evidence or proposals

---

# Boundary Rules

What belongs in the Plugin Editor:

- guided plugin authoring UX
- firmware-backed testing and preview
- plugin validation visibility
- reviewable copilot interaction
- proposal inspection and apply

What does NOT belong in the Plugin Editor:

- silent AI mutation
- hidden runtime compatibility bypasses
- frontend-owned binary heuristics pretending to be authoritative
- ad hoc plugin logic that never becomes a proper contract

---

# Dependencies

This document should directly inform:

- plugin system architecture
- frontend-level architecture
- AI chat / review architecture
- Tauri command bridge architecture
- job system architecture
- Rust core architecture

---

# Core Philosophy

The Plugin Editor should make advanced plugin authoring approachable without making it opaque.

The user should be able to build serious target-specific logic for:

- detection
- metadata
- maps
- single values
- checksum-aware behavior

while always understanding:

- what the plugin is doing
- why it is doing it
- what was AI-suggested
- what has or has not been accepted
