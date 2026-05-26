import type {
  PluginReferenceOwnership,
  PluginValidationScopeState,
} from '../../shared/types/plugins';

const STORAGE_KEY = 'ecudeck.plugin-validation-scope.v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PluginValidationScopeStore {
  loadScope(defaultOwnership: PluginReferenceOwnership): PluginValidationScopeState;
  saveScope(
    ownership: PluginReferenceOwnership,
    defaultOwnership: PluginReferenceOwnership,
  ): PluginValidationScopeState;
}

export function createPluginValidationScopeStore(
  storage: StorageLike | null | undefined,
): PluginValidationScopeStore {
  return {
    loadScope(defaultOwnership: PluginReferenceOwnership): PluginValidationScopeState {
      return loadPersistedScope(storage, defaultOwnership);
    },

    saveScope(
      ownership: PluginReferenceOwnership,
      defaultOwnership: PluginReferenceOwnership,
    ): PluginValidationScopeState {
      const nextState: PluginValidationScopeState = {
        ownership: normalizeOwnership(ownership, defaultOwnership),
      };

      persistScope(storage, nextState);
      return nextState;
    },
  };
}

export const pluginValidationScopeStore = createPluginValidationScopeStore(getBrowserStorage());

function loadPersistedScope(
  storage: StorageLike | null | undefined,
  defaultOwnership: PluginReferenceOwnership,
): PluginValidationScopeState {
  if (!storage) {
    return { ownership: normalizeOwnership(defaultOwnership, defaultOwnership) };
  }

  const raw = storage.getItem(STORAGE_KEY);

  if (!raw) {
    return { ownership: normalizeOwnership(defaultOwnership, defaultOwnership) };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PluginValidationScopeState>;

    return {
      ownership: normalizeOwnership(parsed.ownership, defaultOwnership),
    };
  } catch {
    return { ownership: normalizeOwnership(defaultOwnership, defaultOwnership) };
  }
}

function persistScope(
  storage: StorageLike | null | undefined,
  state: PluginValidationScopeState,
): void {
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeOwnership(
  ownership: Partial<PluginReferenceOwnership> | undefined,
  defaultOwnership: PluginReferenceOwnership,
): PluginReferenceOwnership {
  const workspaceId = ownership?.workspaceId?.trim() || defaultOwnership.workspaceId;
  const projectId = normalizeOptionalId(ownership?.projectId) ?? defaultOwnership.projectId;
  const sessionId = normalizeOptionalId(ownership?.sessionId) ?? defaultOwnership.sessionId;

  return {
    workspaceId,
    projectId,
    sessionId,
  };
}

function normalizeOptionalId(value?: string): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage as unknown as StorageLike;
}
