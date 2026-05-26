import {
  DEFAULT_AI_ASSIST_MODEL_ID,
  DEFAULT_AI_ASSIST_PROVIDER_ID,
  type AiAssistProviderConfig,
  type AiAssistPresetId,
  type PersistedAiAssistNativePreview,
  type PersistedAiAssistState,
} from '../../shared/types/aiAssist';
import type { PluginReferenceOwnership } from '../../shared/types/plugins';

const STORAGE_PREFIX = 'ecudeck.ai-assist.v1';
const MAX_PREVIEW_HISTORY = 6;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface SelectPresetInput {
  ownership: PluginReferenceOwnership;
  selectedPresetId: AiAssistPresetId;
}

interface RecordNativePreviewInput {
  ownership: PluginReferenceOwnership;
  preview: PersistedAiAssistNativePreview;
}

interface UpdateProviderConfigInput {
  ownership: PluginReferenceOwnership;
  providerConfig: AiAssistProviderConfig;
}

interface RestorePreviewContextInput {
  ownership: PluginReferenceOwnership;
  preview: PersistedAiAssistNativePreview;
}

export interface AiAssistStore {
  loadState(ownership: PluginReferenceOwnership): PersistedAiAssistState;
  selectPreset(input: SelectPresetInput): PersistedAiAssistState;
  recordNativePreview(input: RecordNativePreviewInput): PersistedAiAssistState;
  updateProviderConfig(input: UpdateProviderConfigInput): PersistedAiAssistState;
  restorePreviewContext(input: RestorePreviewContextInput): PersistedAiAssistState;
}

export function createAiAssistStore(storage: StorageLike | null | undefined): AiAssistStore {
  return {
    loadState(ownership: PluginReferenceOwnership): PersistedAiAssistState {
      return loadPersistedState(storage, ownership);
    },

    selectPreset(input: SelectPresetInput): PersistedAiAssistState {
      const currentState = loadPersistedState(storage, input.ownership);
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: input.ownership,
        selectedPresetId: input.selectedPresetId,
      };

      persistState(storage, nextState);
      return nextState;
    },

    recordNativePreview(input: RecordNativePreviewInput): PersistedAiAssistState {
      const currentState = loadPersistedState(storage, input.ownership);
      const normalizedPreview = normalizeNativePreview(input.preview);
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: input.ownership,
        lastNativePreview: normalizedPreview,
        previewHistory: mergePreviewHistory(currentState.previewHistory ?? [], normalizedPreview),
      };

      persistState(storage, nextState);
      return nextState;
    },

    updateProviderConfig(input: UpdateProviderConfigInput): PersistedAiAssistState {
      const currentState = loadPersistedState(storage, input.ownership);
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: input.ownership,
        providerConfig: normalizeProviderConfig(input.providerConfig),
      };

      persistState(storage, nextState);
      return nextState;
    },

    restorePreviewContext(input: RestorePreviewContextInput): PersistedAiAssistState {
      const currentState = loadPersistedState(storage, input.ownership);
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: input.ownership,
        selectedPresetId: input.preview.presetId,
        providerConfig: normalizeProviderConfig(input.preview.providerConfig),
      };

      persistState(storage, nextState);
      return nextState;
    },
  };
}

export const aiAssistStore = createAiAssistStore(getBrowserStorage());

function loadPersistedState(
  storage: StorageLike | null | undefined,
  ownership: PluginReferenceOwnership,
): PersistedAiAssistState {
  if (!storage) {
    return emptyState(ownership);
  }

  const raw = storage.getItem(storageKey(ownership));

  if (!raw) {
    return emptyState(ownership);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedAiAssistState>;
    const lastNativePreview = normalizePersistedPreview(parsed.lastNativePreview);
    const previewHistory = normalizePreviewHistory(parsed.previewHistory, lastNativePreview);

    return {
      ownership,
      selectedPresetId: isPresetId(parsed.selectedPresetId) ? parsed.selectedPresetId : undefined,
      providerConfig: isAiAssistProviderConfig(parsed.providerConfig)
        ? normalizeProviderConfig(parsed.providerConfig)
        : undefined,
      lastNativePreview,
      previewHistory,
    };
  } catch {
    return emptyState(ownership);
  }
}

function persistState(
  storage: StorageLike | null | undefined,
  state: PersistedAiAssistState,
): void {
  if (!storage) {
    return;
  }

  storage.setItem(storageKey(state.ownership), JSON.stringify(state));
}

function emptyState(ownership: PluginReferenceOwnership): PersistedAiAssistState {
  return {
    ownership,
  };
}

function storageKey(ownership: PluginReferenceOwnership): string {
  return [
    STORAGE_PREFIX,
    ownership.workspaceId,
    ownership.projectId ?? '_',
    ownership.sessionId ?? '_',
  ].join('::');
}

function isPresetId(value: unknown): value is AiAssistPresetId {
  return (
    value === 'map-region-summary' ||
    value === 'bosch-pattern-compare' ||
    value === 'first-pass-review'
  );
}

function isAiAssistProviderConfig(value: unknown): value is AiAssistProviderConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.providerId === 'string' &&
    (candidate.modelId == null || typeof candidate.modelId === 'string')
  );
}

function isPersistedAiAssistNativePreview(value: unknown): value is PersistedAiAssistNativePreview {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.presetId == null || isPresetId(candidate.presetId)) &&
    typeof candidate.draftKey === 'string' &&
    (candidate.providerConfig == null || isAiAssistProviderConfig(candidate.providerConfig)) &&
    (candidate.recordedAt == null || typeof candidate.recordedAt === 'string') &&
    isPrepareContextSnapshotResponse(candidate.snapshotResponse) &&
    isSendAiChatResponse(candidate.chatResponse)
  );
}

function isPrepareContextSnapshotResponse(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (!candidate.snapshot || typeof candidate.snapshot !== 'object') {
    return false;
  }

  const snapshot = candidate.snapshot as Record<string, unknown>;
  return (
    typeof snapshot.snapshotId === 'string' &&
    typeof snapshot.summaryText === 'string' &&
    isCompressionMetadata(snapshot.metadata)
  );
}

function isCompressionMetadata(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.strategy === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.lossy === 'boolean' &&
    typeof candidate.createdAt === 'string'
  );
}

function isSendAiChatResponse(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isResponseKind(candidate.responseKind) &&
    typeof candidate.summaryText === 'string' &&
    isProposalContextReference(candidate.proposal)
  );
}

function isResponseKind(value: unknown): boolean {
  return value === 'explanation' || value === 'plan' || value === 'proposal';
}

function isProposalContextReference(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.proposalId === 'string' &&
    (candidate.contextSnapshotId == null || typeof candidate.contextSnapshotId === 'string')
  );
}

function normalizeNativePreview(
  preview: PersistedAiAssistNativePreview,
): PersistedAiAssistNativePreview {
  const providerConfig = normalizeProviderConfig(preview.providerConfig) ?? {
    providerId: DEFAULT_AI_ASSIST_PROVIDER_ID,
    modelId: DEFAULT_AI_ASSIST_MODEL_ID,
  };
  const recordedAt =
    preview.recordedAt?.trim() || preview.snapshotResponse.snapshot.metadata.createdAt;

  return {
    ...preview,
    providerConfig,
    recordedAt,
    chatResponse: {
      ...preview.chatResponse,
      proposal: preview.chatResponse.proposal ?? undefined,
    },
  };
}

function normalizePersistedPreview(value: unknown): PersistedAiAssistNativePreview | undefined {
  if (!isPersistedAiAssistNativePreview(value)) {
    return undefined;
  }

  const presetId = resolvePreviewPresetId(value);

  if (!presetId) {
    return undefined;
  }

  return normalizeNativePreview({
    ...(value as PersistedAiAssistNativePreview),
    presetId,
  });
}

function normalizePreviewHistory(
  value: unknown,
  lastNativePreview?: PersistedAiAssistNativePreview,
): PersistedAiAssistNativePreview[] | undefined {
  const normalizedHistory = Array.isArray(value)
    ? value
        .map((entry) => normalizePersistedPreview(entry))
        .filter((entry): entry is PersistedAiAssistNativePreview => Boolean(entry))
    : [];

  if (lastNativePreview) {
    const mergedHistory = mergePreviewHistory(normalizedHistory, lastNativePreview);
    return mergedHistory.length > 0 ? mergedHistory : undefined;
  }

  return normalizedHistory.length > 0 ? normalizedHistory.slice(0, MAX_PREVIEW_HISTORY) : undefined;
}

function mergePreviewHistory(
  previewHistory: PersistedAiAssistNativePreview[],
  nextPreview: PersistedAiAssistNativePreview,
): PersistedAiAssistNativePreview[] {
  return [
    nextPreview,
    ...previewHistory.filter(
      (preview) =>
        preview.snapshotResponse.snapshot.snapshotId !==
        nextPreview.snapshotResponse.snapshot.snapshotId,
    ),
  ].slice(0, MAX_PREVIEW_HISTORY);
}

function normalizeProviderConfig(
  providerConfig: AiAssistProviderConfig,
): AiAssistProviderConfig | undefined {
  const providerId = providerConfig.providerId.trim();
  const modelId = providerConfig.modelId?.trim() || undefined;

  if (!providerId) {
    return undefined;
  }

  return {
    providerId,
    modelId,
  };
}

function resolvePreviewPresetId(value: unknown): AiAssistPresetId | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;

  if (isPresetId(candidate.presetId)) {
    return candidate.presetId;
  }

  const draftKey = typeof candidate.draftKey === 'string' ? candidate.draftKey : '';
  const [maybePresetId] = draftKey.split('::');

  return isPresetId(maybePresetId) ? maybePresetId : undefined;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage as unknown as StorageLike;
}
