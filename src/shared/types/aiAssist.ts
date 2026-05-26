import type {
  AiRequestMode,
  AiRequestOwnership,
  ContextSourceKind,
  PrepareContextSnapshotResponse,
  ReviewDecisionStatus,
  SendAiChatResponse,
} from './aiContext';
import type { PersistedFirmwareSummary } from './ecu';
import type { PluginReferenceOwnership } from './plugins';

export const DEFAULT_AI_ASSIST_PROVIDER_ID = 'preview-provider';
export const DEFAULT_AI_ASSIST_MODEL_ID = 'draft-preview';

export type AiAssistPresetId = 'map-region-summary' | 'bosch-pattern-compare' | 'first-pass-review';
export type AiAssistReviewStatus = ReviewDecisionStatus;
export type AiAssistReviewDecisionType = 'approve' | 'reject' | 'needs-follow-up' | 'note';

export interface AiAssistPreset {
  id: AiAssistPresetId;
  title: string;
  prompt: string;
  mode: AiRequestMode;
}

export interface AiAssistProviderConfig {
  providerId: string;
  modelId?: string;
}

export interface AiAssistReviewDecisionDetails {
  decisionType?: AiAssistReviewDecisionType;
  reviewerId?: string;
  comment?: string;
}

export interface AiAssistReviewDecision extends AiAssistReviewDecisionDetails {
  status: AiAssistReviewStatus;
  decisionType: AiAssistReviewDecisionType;
  decidedAt?: string;
}

export interface PersistedAiAssistProposalReview {
  proposalId: string;
  snapshotId: string;
  presetId: AiAssistPresetId;
  providerConfig: AiAssistProviderConfig;
  summaryText: string;
  reviewDecision: AiAssistReviewDecision;
  recordedAt: string;
}

export interface PersistedAiAssistState {
  ownership: PluginReferenceOwnership;
  selectedPresetId?: AiAssistPresetId;
  providerConfig?: AiAssistProviderConfig;
  lastNativePreview?: PersistedAiAssistNativePreview;
  previewHistory?: PersistedAiAssistNativePreview[];
  proposalReviews?: PersistedAiAssistProposalReview[];
}

export interface AiAssistDraft {
  preset: AiAssistPreset;
  ownership: AiRequestOwnership;
  contextKinds: ContextSourceKind[];
  firmwareSummary?: PersistedFirmwareSummary;
}

export interface PersistedAiAssistNativePreview {
  presetId: AiAssistPresetId;
  draftKey: string;
  providerConfig: AiAssistProviderConfig;
  recordedAt: string;
  reviewDecision: AiAssistReviewDecision;
  snapshotResponse: PrepareContextSnapshotResponse;
  chatResponse: SendAiChatResponse;
}
