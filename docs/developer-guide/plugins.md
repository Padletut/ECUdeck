# Plugins

Plugins are a first-class extension mechanism in ECUDeck.

## Plugin Goals

Plugins should make it possible to support new ECU families and behaviors without turning the core codebase into an unbounded monolith.

## Core Rules

- plugin contracts must be explicit
- plugin behavior should be versioned
- validation should be visible to the user
- compatibility expectations should be documented

## Plugin Authoring Direction

ECUDeck should support:

- structured plugin authoring
- user-friendly plugin editing
- AI-assisted plugin scaffolding
- raw-source inspection when needed
- review before apply

## Contract Stability

Plugin evolution should assume future versions such as:

- Plugin API v1
- Plugin Schema v2
- compatibility layers

The project should not rely on tribal knowledge for plugin behavior.

## Validation Expectations

Plugins should be validated for:

- detect logic
- metadata parsing
- map discovery assumptions
- export behavior
- compatibility with the declared contract version

## Documentation Expectations

Every plugin-facing subsystem should document:

- contract purpose
- expected inputs
- expected outputs
- failure behavior
- compatibility expectations
