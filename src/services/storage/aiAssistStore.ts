import type {
  AiAssistProviderConfig,
  AiAssistPresetId,
  PersistedAiAssistNativePreview,
  PersistedAiAssistState,
} from '../../shared/types/aiAssist';
import type { PluginReferenceOwnership } from '../../shared/types/plugins';

const STORAGE_PREFIX = 'ecudeck.ai-assist.v1';

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

export interface AiAssistStore {
  loadState(ownership: PluginReferenceOwnership): PersistedAiAssistState;
  selectPreset(input: SelectPresetInput): PersistedAiAssistState;
  recordNativePreview(input: RecordNativePreviewInput): PersistedAiAssistState;
  updateProviderConfig(input: UpdateProviderConfigInput): PersistedAiAssistState;
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
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: input.ownership,
        lastNativePreview: input.preview,
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

    return {
      ownership,
      selectedPresetId: isPresetId(parsed.selectedPresetId) ? parsed.selectedPresetId : undefined,
      providerConfig: isAiAssistProviderConfig(parsed.providerConfig)
        ? normalizeProviderConfig(parsed.providerConfig)
        : undefined,
      lastNativePreview: isPersistedAiAssistNativePreview(parsed.lastNativePreview)
        ? normalizeNativePreview(parsed.lastNativePreview)
        : undefined,
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
    typeof candidate.draftKey === 'string' &&
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
  return {
    ...preview,
    chatResponse: {
      ...preview.chatResponse,
      proposal: preview.chatResponse.proposal ?? undefined,
    },
  };
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

function getBrowserStorage(): StorageLike | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage as unknown as StorageLike;
}
