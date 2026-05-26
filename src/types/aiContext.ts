export type AiRequestMode = 'ask' | 'plan' | 'agent' | 'review';

export type ContextSourceKind =
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

export type CompressionStrategy = 'none' | 'summary' | 'hierarchical-summary' | 'budgeted-pack';

export type SnapshotStatus = 'fresh' | 'stale' | 'invalidated';

export type ContextEventType =
  | 'context-snapshot-created'
  | 'context-snapshot-refreshed'
  | 'context-snapshot-invalidated'
  | 'context-compression-failed';

export interface ContextSourceRef {
  sourceId: string;
  kind: ContextSourceKind;
  version?: string;
  fingerprint?: string;
}

export interface RawContextAttachment {
  attachmentId: string;
  source: ContextSourceRef;
  includedFields?: string[];
}

export interface CompressionPolicy {
  strategy?: CompressionStrategy;
  targetTokenBudget?: number;
  allowLossyCompression?: boolean;
}

export interface CompressionMetadata {
  strategy: CompressionStrategy;
  status: SnapshotStatus;
  lossy: boolean;
  targetTokenBudget?: number;
  estimatedInputTokens?: number;
  estimatedSnapshotTokens?: number;
  createdAt: string;
}

export interface CompressedContextSnapshot {
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

export interface AiRequestOwnership {
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
  firmwareIds?: string[];
  pluginReferenceIds?: string[];
  reviewProposalId?: string;
}

export interface AiRequestContextEnvelope {
  rawAttachments: RawContextAttachment[];
  retrievedContextRefs: ContextSourceRef[];
  compressedSnapshot?: CompressedContextSnapshot;
}

export interface PrepareContextSnapshotRequest {
  ownership: AiRequestOwnership;
  mode: AiRequestMode;
  context: AiRequestContextEnvelope;
  compression?: CompressionPolicy;
}

export interface PrepareContextSnapshotResponse {
  snapshot: CompressedContextSnapshot;
}

export interface RefreshContextSnapshotRequest {
  snapshotId: string;
  ownership: AiRequestOwnership;
  context: AiRequestContextEnvelope;
  compression?: CompressionPolicy;
}

export interface RefreshContextSnapshotResponse {
  snapshot: CompressedContextSnapshot;
}

export interface SendAiChatRequest {
  providerId: string;
  modelId?: string;
  mode: AiRequestMode;
  prompt: string;
  ownership: AiRequestOwnership;
  context: AiRequestContextEnvelope;
  contextSnapshotId?: string;
}

export interface ProposalContextReference {
  proposalId: string;
  contextSnapshotId?: string;
}

export interface ContextSnapshotEvent {
  type: ContextEventType;
  snapshotId?: string;
  ownership: AiRequestOwnership;
  occurredAt: string;
  errorMessage?: string;
}
