# ECUDeck — Plugin System Architecture

> Detailed architecture for plugin contracts, schema versioning, runtime behavior, validation, compatibility, and editor/review integration.

---

# Purpose

This document defines how the ECUDeck plugin system should work as a long-term extension surface.

It exists to make the following explicit:

- what plugins are allowed to do
- how plugin contracts should be versioned
- how schemas and runtime behavior should evolve
- how plugin validation should work
- how plugin references should be attached to projects and sessions
- how the plugin editor and AI assistance should interact with plugin definitions

The plugin system is a first-class architecture concern, not an optional convenience layer.

---

# Plugin Mission

Plugins should allow ECUDeck to support new ECU families, metadata strategies, map discovery heuristics, and export behaviors without collapsing the core into a monolithic tangle of target-specific code.

Plugins should make extension possible while preserving:

- deterministic behavior where required
- explicit compatibility rules
- reviewable authoring workflows
- traceability of which plugin influenced which analysis

---

# Core Principle

Plugins extend the platform.

They do not replace core ownership of:

- domain identity
- compatibility enforcement
- validation boundaries
- review/apply safety

The plugin system should be powerful, but not anarchic.

---

# Plugin Roles

Plugins may assist with:

- ECU detection
- metadata extraction
- map discovery
- map naming and interpretation hints
- validation rules
- export behavior
- target-specific heuristics

Plugins should not be treated as invisible magic.

Their assumptions and outputs should remain visible and traceable.

---

# Plugin Categories

The system should be able to distinguish between different plugin responsibilities.

## Detection Plugins

Responsibilities:

- identify ECU family or platform matches
- expose confidence and reasoning hints

---

## Metadata Plugins

Responsibilities:

- extract identifiers
- expose known target metadata
- normalize target-specific structured fields

---

## Map Discovery Plugins

Responsibilities:

- locate map candidates
- describe likely axes and value regions
- expose plugin-derived confidence or notes

---

## Validation Plugins

Responsibilities:

- check target-specific rules
- flag compatibility or interpretation issues
- add explainable warnings

---

## Export Plugins

Responsibilities:

- guide patch/export behavior
- define target-specific output expectations
- participate in checksum-aware export paths when appropriate

---

# Contract Layers

The plugin system should define more than one “version.”

At minimum, separate:

- plugin API version
- plugin schema version
- runtime compatibility version

These should not be collapsed into one ambiguous field.

---

## Plugin API Version

Defines:

- callable behaviors
- expected capabilities
- runtime contract shape

Examples:

- `Plugin API v1`
- `Plugin API v2`

---

## Plugin Schema Version

Defines:

- manifest/config structure
- metadata fields
- authoring/editing schema
- validation rules for the plugin definition itself

Examples:

- `Plugin Schema v1`
- `Plugin Schema v2`

---

## Runtime Compatibility Version

Defines:

- whether the current ECUDeck runtime can safely execute the plugin
- whether shims or compatibility adapters are required

This makes compatibility enforcement more explicit and less error-prone than relying on loose best-effort behavior.

---

# Plugin Contract Shape

Every plugin should expose a clear, documented contract.

At minimum, a plugin definition should communicate:

- plugin id
- plugin name
- plugin version
- plugin schema version
- plugin API version
- supported target families
- declared capabilities
- compatibility constraints

The runtime should be able to determine whether the plugin is:

- loadable
- valid
- compatible
- partially compatible through a compatibility layer
- rejected

---

# Runtime Capabilities

Conceptually, plugins may implement capabilities such as:

```text
detect
parse_metadata
find_maps
validate
export_patch
```

Not every plugin must implement every capability.

Capabilities should be declared explicitly rather than assumed.

This lets the runtime know what a plugin can and cannot be used for.

---

# Versioning Rules

Plugin contracts should be versioned from the beginning.

Recommended rule:

- breaking runtime behavior changes require API version awareness
- breaking structure changes require schema version awareness
- compatibility shims should be explicit, not accidental

The system should be able to say:

- this plugin is valid and fully supported
- this plugin is valid but requires a compatibility layer
- this plugin is structurally valid but not runtime compatible
- this plugin is rejected

---

# Compatibility Layers

Compatibility layers are not a failure.

They are an intentional strategy to prevent:

```text
plugin apocalypse civilization
```

Compatibility layers may be used to:

- adapt older plugin schemas
- normalize older capability declarations
- preserve limited support for old plugin versions during migration

However:

- compatibility layers should be explicit
- compatibility layers should be testable
- compatibility layers should not silently change semantic meaning

---

# Validation Model

Plugin validation should happen at multiple levels.

## Structural Validation

Checks:

- manifest/schema shape
- required fields
- version presence
- capability declarations

---

## Compatibility Validation

Checks:

- plugin API compatibility
- runtime compatibility
- support for the declared ECUDeck version range

---

## Semantic Validation

Checks:

- target assumptions
- capability coherence
- invalid combinations
- impossible or conflicting declarations

---

## Runtime Validation

Checks:

- whether the plugin can actually be loaded
- whether required resources are present
- whether declared capabilities can execute safely

---

# Plugin Runtime Boundary

The plugin runtime should remain part of the Rust core, not the frontend.

Recommended rule:

- frontend edits and inspects plugin definitions
- command bridge validates and dispatches plugin operations
- Rust runtime enforces plugin contracts and execution rules

This keeps plugin behavior deterministic and testable.

---

# Plugin References

Plugin usage should be traceable at the project and session level.

A plugin reference should capture:

- plugin id
- plugin version
- API/schema version
- capability usage
- confidence or notes when relevant

This should make it possible to answer:

- which plugin influenced this result
- which version was used
- which session used it
- whether compatibility adaptation was involved

---

# Project / Session Relationship

Recommended ownership rules:

- plugin references are primarily project-scoped
- sessions may snapshot the specific references they used
- review proposals should be able to mention relevant plugin references

This preserves both reuse and historical traceability.

---

# Plugin Editor Integration

The plugin editor is a first-class consumer of the plugin system architecture.

See also: [Plugin Editor Architecture](plugin-editor-architecture.md)

The plugin editor should support:

- manifest editing
- schema-driven forms
- capability visibility
- version visibility
- compatibility feedback
- validation output
- attached firmware/sample testing
- detection workbenches for data regions, maps, single values, and checksum-related rules
- embedded copilot chat and proposal review
- raw-source inspection when needed

The default UX should be guided and user-friendly, not “edit raw files or good luck.”

---

# AI-Assisted Plugin Authoring

AI assistance should help the user:

- scaffold plugin structure
- explain required fields
- propose capability wiring
- help detect likely data regions
- help detect map candidates
- help detect single values
- help reason about checksum-related rules
- suggest validation fixes
- explain compatibility issues

Inside the Plugin Editor, the intended AI surface is a copilot chat bound to the active plugin document, validation state, and optionally attached firmware evidence.

AI should not silently produce final authoritative plugin changes without review.

Recommended flow:

```text
User Intent
    ->
AI Proposal
    ->
Plugin Review Object
    ->
Accept / Reject / Accept All / Reject All
    ->
Validated Apply
```

This keeps the human operator as final authority.

---

# Review Workflow

Plugin edits should integrate naturally with the general review system.

A plugin review object should be able to contain:

- metadata changes
- schema field changes
- capability changes
- compatibility notes
- generated source changes

Review should support:

- accept change
- reject change
- accept all
- reject all

Plugin changes should not bypass review simply because they were AI-generated or schema-driven.

---

# Plugin Command Bridge Surface

The Tauri command bridge should expose stable plugin-related commands such as:

- validate plugin
- load plugin schema
- generate plugin scaffold
- resolve plugin references
- apply plugin edits

These commands should return structured responses including:

- validation results
- compatibility state
- warnings
- proposed edits
- applied results

---

# Error Model

Plugin errors should be structured and category-aware.

Important categories include:

- invalid schema
- unsupported API version
- incompatible runtime version
- missing capability
- invalid target declaration
- runtime load failure
- validation failure

The frontend should be able to present these clearly inside the plugin editor and review surfaces.

---

# Storage Direction

Plugins should remain repository-native and inspectable.

Conceptually:

```text
plugins/
    shared/
    edc15/
    edc16/
    med9/
```

Each plugin area should be structured enough to support:

- manifest/schema definitions
- target metadata
- related documentation
- validation/test artifacts where appropriate

---

# Testing Expectations

The plugin system should be tested at several levels.

## Structural Tests

For:

- manifest parsing
- schema validation
- compatibility declarations

---

## Runtime Tests

For:

- capability dispatch
- plugin loading
- compatibility layer behavior
- validation output

---

## Integration Tests

For:

- plugin-assisted detection
- metadata parsing
- map discovery flows
- plugin editor review/apply workflows

---

# Boundary Rules

What belongs in the plugin system:

- plugin contracts
- versioning
- validation
- compatibility layers
- runtime capability dispatch
- plugin reference traceability

What does NOT belong in the plugin system:

- ownership of global workspace state
- direct UI orchestration
- hidden bypasses around core validation
- unreviewed mutation of project artifacts

---

# Dependencies

This document should directly inform:

- Rust core architecture
- Tauri command bridge architecture
- workspace/project/session architecture
- frontend-level architecture
- AI chat/review architecture

---

# Core Philosophy

```text
The plugin system should make ECU-specific extension structured,
versioned,
traceable,
and safe to evolve.
```
