import type {
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

export type AiAssistSurface = 'map-editor' | 'plugin-editor';
export type AiAssistMode = 'ask' | 'plan' | 'agent';
export type AiAssistReviewStatus = ReviewDecisionStatus;
export type AiAssistReviewDecisionType = 'approve' | 'reject' | 'needs-follow-up' | 'note';

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
  mode: AiAssistMode;
  promptText: string;
  providerConfig: AiAssistProviderConfig;
  summaryText: string;
  reviewDecision: AiAssistReviewDecision;
  recordedAt: string;
}

export interface PersistedAiAssistState {
  ownership: PluginReferenceOwnership;
  surface: AiAssistSurface;
  selectedMode?: AiAssistMode;
  draftPrompt?: string;
  providerConfig?: AiAssistProviderConfig;
  lastNativePreview?: PersistedAiAssistNativePreview;
  previewHistory?: PersistedAiAssistNativePreview[];
  proposalReviews?: PersistedAiAssistProposalReview[];
}

export interface AiAssistDraft {
  surface: AiAssistSurface;
  mode: AiAssistMode;
  prompt: string;
  ownership: AiRequestOwnership;
  contextKinds: ContextSourceKind[];
  firmwareSummary?: PersistedFirmwareSummary;
}

export interface PersistedAiAssistNativePreview {
  mode: AiAssistMode;
  prompt: string;
  draftKey: string;
  providerConfig: AiAssistProviderConfig;
  recordedAt: string;
  reviewDecision: AiAssistReviewDecision;
  snapshotResponse: PrepareContextSnapshotResponse;
  chatResponse: SendAiChatResponse;
}
