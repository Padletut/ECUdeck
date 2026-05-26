# Python

Python is not the primary long-term platform layer for ECUDeck, but it may still be useful in specific roles.

## Appropriate Uses

Python is acceptable for:

- migration-era experiments
- ML or data-science prototypes
- local tooling
- temporary analysis scripts
- offline dataset preparation

## Inappropriate Uses

Do not use Python as the default place for:

- core parsing contracts
- long-term binary validation logic
- user-critical desktop workflows
- permanent command bridge behavior that belongs in Rust

## Placement

Python code that remains during migration should live in intentionally labeled locations such as legacy or tooling areas.

It should not quietly define the architecture of the active product.

## Expectations

If you add or keep Python code:

- document why it exists
- document inputs and outputs
- explain whether it is experimental or strategic
- define the migration plan if it should eventually move to Rust

## Environment

Use an isolated Python environment for Python-specific work.

Do not assume Python packages are part of the main JS/Rust workflow unless explicitly documented.
