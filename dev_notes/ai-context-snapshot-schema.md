# ECUDeck - AI Context Snapshot Schema

> Concrete typed schema for raw AI context attachments, compressed context snapshots, and request envelopes.

---

# Purpose

This document defines a concrete architecture-level shape for AI context snapshotting and compression.

It exists so that:

- frontend UX can show what context is actually being sent
- the command bridge can validate typed request payloads
- proposal and review objects can keep audit references to the context they depended on

The exact implementation language can evolve.

The important part is that the concepts stay explicit and typed.

---

# Core Design Rules

- raw context attachments and compressed context snapshots should be modeled separately
- compressed snapshots should preserve provenance and freshness metadata
- lossy compression should be visible in typed metadata
- reviewable proposals should retain the snapshot reference used to generate them
- stale snapshots should be refreshable instead of silently reused

---

# Recommended Types

```ts
type AiRequestMode = 'ask' | 'plan' | 'agent' | 'review';

type ContextSourceKind =
  | 'chat-turn'
  | 'workspace-metadata'
  | 'project-metadata'
  | 'session-metadata'
  | 'firmware-summary'
  | 'map-selection'
  | 'plugin-reference'
  | 'plugin-validation'
  | 'proposal'
  | 'review';

type CompressionStrategy = 'none' | 'summary' | 'hierarchical-summary' | 'budgeted-pack';

type SnapshotStatus = 'fresh' | 'stale' | 'invalidated';

interface ContextSourceRef {
  sourceId: string;
  kind: ContextSourceKind;
  version?: string;
  fingerprint?: string;
}

interface RawContextAttachment {
  attachmentId: string;
  source: ContextSourceRef;
  includedFields?: string[];
}

interface CompressionMetadata {
  strategy: CompressionStrategy;
  status: SnapshotStatus;
  lossy: boolean;
  targetTokenBudget?: number;
  estimatedInputTokens?: number;
  estimatedSnapshotTokens?: number;
  createdAt: string;
}

interface CompressedContextSnapshot {
  snapshotId: string;
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
  mode: AiRequestMode;
  sourceRefs: ContextSourceRef[];
  summaryText: string;
  unresolvedAssumptions: string[];
  safetyWarnings: string[];
  acceptedDecisionRefs: string[];
  rejectedDecisionRefs: string[];
  metadata: CompressionMetadata;
}

interface AiRequestContextEnvelope {
  rawAttachments: RawContextAttachment[];
  retrievedContextRefs: ContextSourceRef[];
  compressedSnapshot?: CompressedContextSnapshot;
}

interface ProposalContextReference {
  proposalId: string;
  contextSnapshotId?: string;
}
```

---

# Lifecycle Rules

A compressed context snapshot should be invalidated when any of the following changes materially:

- attached source artifact versions
- accepted or rejected review decisions that the summary depends on
- active project or session ownership
- map/plugin/firmware focus required by the current mode

When invalidated, the UI and command bridge should prefer explicit refresh over silent reuse.

---

# Proposal and Review Rules

If a proposal or review object was generated from compressed context, it should retain the snapshot id that shaped the request.

This supports:

- auditability
- reproducibility
- stale-context detection during apply
- clearer explanation of what the provider actually saw

---

# Bridge Expectations

The Tauri/native bridge should be able to:

- accept an AiRequestContextEnvelope in AI-facing commands
- return a CompressedContextSnapshot from snapshot preparation commands
- reject stale or invalidated snapshots for high-impact flows when policy requires freshness

---

# Frontend Expectations

The frontend should be able to render:

- raw attachments
- retrieved context references
- active snapshot status
- lossy versus non-lossy compression state
- snapshot ownership by workspace/project/session

This keeps context compression visible and reviewable instead of buried in provider plumbing.
