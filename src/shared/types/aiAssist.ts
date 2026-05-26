import type { AiRequestMode, AiRequestOwnership, ContextSourceKind } from './aiContext';
import type { PersistedFirmwareSummary } from './ecu';
import type { PluginReferenceOwnership } from './plugins';

export type AiAssistPresetId = 'map-region-summary' | 'bosch-pattern-compare' | 'first-pass-review';

export interface AiAssistPreset {
  id: AiAssistPresetId;
  title: string;
  prompt: string;
  mode: AiRequestMode;
}

export interface PersistedAiAssistState {
  ownership: PluginReferenceOwnership;
  selectedPresetId?: AiAssistPresetId;
}

export interface AiAssistDraft {
  preset: AiAssistPreset;
  ownership: AiRequestOwnership;
  contextKinds: ContextSourceKind[];
  firmwareSummary?: PersistedFirmwareSummary;
}
