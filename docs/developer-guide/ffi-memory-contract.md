# FFI Memory Contract

This guide defines memory ownership rules for foreign-function boundaries.

Even if large parts of ECUDeck currently use typed command serialization through Tauri, future native boundaries may still require stricter FFI contracts.

## Core Rule

Memory ownership must always be explicit.

Every boundary crossing should clearly answer:

- who allocates
- who owns
- who frees
- how long the memory remains valid

## Input Rules

- input buffers should be treated as immutable unless the contract explicitly says otherwise
- pointer + length pairs must always be validated together
- borrowed data must never outlive the owner

## Output Rules

- returned buffers must have a documented owner
- if Rust allocates output memory, the release mechanism must also be defined
- prefer structured handles or serialized messages over raw shared pointers when possible

## Lifetime Rules

- do not return references to stack-owned memory
- do not expose borrowed Rust internals across an FFI boundary
- do not assume caller and callee share allocator semantics

## Safety Rules

- nullability must be explicit
- string encoding must be explicit
- buffer lengths must be explicit
- ownership transfer must be explicit

## Preferred Direction in ECUDeck

When practical, prefer:

- typed command payloads
- serialized messages
- stable IDs and handles
- explicit copy boundaries

over ad hoc pointer-sharing models.

This reduces the chance of:

- double frees
- use-after-free bugs
- mismatched allocators
- accidental aliasing across language boundaries
