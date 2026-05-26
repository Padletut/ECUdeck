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

export interface AiAssistReviewDecision {
  status: AiAssistReviewStatus;
  decidedAt?: string;
}

export interface PersistedAiAssistState {
  ownership: PluginReferenceOwnership;
  selectedPresetId?: AiAssistPresetId;
  providerConfig?: AiAssistProviderConfig;
  lastNativePreview?: PersistedAiAssistNativePreview;
  previewHistory?: PersistedAiAssistNativePreview[];
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
