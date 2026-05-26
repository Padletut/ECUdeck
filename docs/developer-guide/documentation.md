# Documentation

Documentation is part of the architecture, not an afterthought.

## Documentation Standards

Good ECUDeck documentation should explain:

- purpose
- responsibilities
- what belongs in a subsystem
- what does not belong there
- inputs and outputs
- public contracts
- invariants
- failure modes
- examples

## Writing Rules

- Write in clear English.
- Be specific.
- Prefer concrete examples over abstract claims.
- Update docs when architecture changes.
- Keep terminology consistent with the rest of the project.

## Where Documentation Belongs

- high-level architecture in design and planning docs
- subsystem rules near the subsystem
- contributor workflows in the developer guide
- user-facing technical docs in `docs/`

## Acceptable Diagram Style

Plain text diagrams are acceptable and encouraged when they are easy to maintain in-repo.

## Documentation Triggers

Update docs when you change:

- repository structure
- command contracts
- plugin contracts
- review workflows
- release process
- subsystem ownership

## Definition of Done

A change is not fully done if it changes architecture or workflow behavior and leaves the documentation misleading.
