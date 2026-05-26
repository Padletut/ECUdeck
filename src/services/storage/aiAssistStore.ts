import type { AiAssistPresetId, PersistedAiAssistState } from '../../shared/types/aiAssist';
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

export interface AiAssistStore {
  loadState(ownership: PluginReferenceOwnership): PersistedAiAssistState;
  selectPreset(input: SelectPresetInput): PersistedAiAssistState;
}

export function createAiAssistStore(storage: StorageLike | null | undefined): AiAssistStore {
  return {
    loadState(ownership: PluginReferenceOwnership): PersistedAiAssistState {
      return loadPersistedState(storage, ownership);
    },

    selectPreset(input: SelectPresetInput): PersistedAiAssistState {
      const nextState: PersistedAiAssistState = {
        ownership: input.ownership,
        selectedPresetId: input.selectedPresetId,
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
    return { ownership };
  }

  const raw = storage.getItem(storageKey(ownership));

  if (!raw) {
    return { ownership };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedAiAssistState>;

    return {
      ownership,
      selectedPresetId: isPresetId(parsed.selectedPresetId) ? parsed.selectedPresetId : undefined,
    };
  } catch {
    return { ownership };
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

function getBrowserStorage(): StorageLike | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage as unknown as StorageLike;
}
