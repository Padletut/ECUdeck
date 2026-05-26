import type { PersistedFirmwareSummary } from '../../shared/types/ecu';
import type { PluginReferenceOwnership } from '../../shared/types/plugins';

const STORAGE_PREFIX = 'ecudeck.firmware-workspace.v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface RecordLoadedFirmwareInput {
  ownership: PluginReferenceOwnership;
  fileName: string;
  size: number;
  checksum?: string;
}

export interface PersistedFirmwareWorkspaceState {
  ownership: PluginReferenceOwnership;
  lastLoadedFirmware?: PersistedFirmwareSummary;
}

export interface FirmwareWorkspaceStore {
  loadState(ownership: PluginReferenceOwnership): PersistedFirmwareWorkspaceState;
  recordLoadedFirmware(input: RecordLoadedFirmwareInput): PersistedFirmwareWorkspaceState;
}

export function createFirmwareWorkspaceStore(
  storage: StorageLike | null | undefined,
  now: () => string = () => new Date().toISOString(),
): FirmwareWorkspaceStore {
  return {
    loadState(ownership: PluginReferenceOwnership): PersistedFirmwareWorkspaceState {
      return loadPersistedState(storage, ownership);
    },

    recordLoadedFirmware(input: RecordLoadedFirmwareInput): PersistedFirmwareWorkspaceState {
      const nextState: PersistedFirmwareWorkspaceState = {
        ownership: input.ownership,
        lastLoadedFirmware: {
          fileName: input.fileName.trim(),
          size: input.size,
          checksum: normalizeOptionalValue(input.checksum),
          loadedAt: now(),
        },
      };

      persistState(storage, nextState);
      return nextState;
    },
  };
}

export const firmwareWorkspaceStore = createFirmwareWorkspaceStore(getBrowserStorage());

function loadPersistedState(
  storage: StorageLike | null | undefined,
  ownership: PluginReferenceOwnership,
): PersistedFirmwareWorkspaceState {
  if (!storage) {
    return emptyState(ownership);
  }

  const raw = storage.getItem(storageKey(ownership));

  if (!raw) {
    return emptyState(ownership);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedFirmwareWorkspaceState>;
    const lastLoadedFirmware = isPersistedFirmwareSummary(parsed.lastLoadedFirmware)
      ? parsed.lastLoadedFirmware
      : undefined;

    return {
      ownership,
      lastLoadedFirmware,
    };
  } catch {
    return emptyState(ownership);
  }
}

function persistState(
  storage: StorageLike | null | undefined,
  state: PersistedFirmwareWorkspaceState,
): void {
  if (!storage) {
    return;
  }

  storage.setItem(storageKey(state.ownership), JSON.stringify(state));
}

function emptyState(ownership: PluginReferenceOwnership): PersistedFirmwareWorkspaceState {
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

function normalizeOptionalValue(value?: string): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function isPersistedFirmwareSummary(value: unknown): value is PersistedFirmwareSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.fileName === 'string' &&
    typeof candidate.size === 'number' &&
    typeof candidate.loadedAt === 'string'
  );
}

function getBrowserStorage(): StorageLike | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage as unknown as StorageLike;
}
