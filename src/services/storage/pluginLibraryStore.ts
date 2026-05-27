import type { PersistedPluginLibraryEntry } from '../../shared/types/plugins';

const STORAGE_KEY = 'ecudeck.plugin-library.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PluginLibraryStore {
  loadEntries(seedEntries?: PersistedPluginLibraryEntry[]): PersistedPluginLibraryEntry[];
  saveEntries(entries: PersistedPluginLibraryEntry[]): PersistedPluginLibraryEntry[];
}

export function createPluginLibraryStore(
  storage: StorageLike | null | undefined,
): PluginLibraryStore {
  return {
    loadEntries(seedEntries: PersistedPluginLibraryEntry[] = []): PersistedPluginLibraryEntry[] {
      if (!storage) {
        return seedEntries;
      }

      const raw = storage.getItem(STORAGE_KEY);

      if (!raw) {
        return seedEntries;
      }

      try {
        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
          return seedEntries;
        }

        const entries = parsed.filter(isPersistedPluginLibraryEntry);
        return entries.length > 0 ? entries : seedEntries;
      } catch {
        return seedEntries;
      }
    },

    saveEntries(entries: PersistedPluginLibraryEntry[]): PersistedPluginLibraryEntry[] {
      if (!storage) {
        return entries;
      }

      storage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return entries;
    },
  };
}

export const pluginLibraryStore = createPluginLibraryStore(getBrowserStorage());

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function isPersistedPluginLibraryEntry(value: unknown): value is PersistedPluginLibraryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const manifest = candidate.manifest as Record<string, unknown> | undefined;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    isPluginLibrarySource(candidate.source) &&
    Boolean(manifest) &&
    typeof manifest?.pluginId === 'string' &&
    typeof manifest?.pluginName === 'string' &&
    typeof manifest?.pluginVersion === 'string' &&
    typeof manifest?.apiVersion === 'string' &&
    typeof manifest?.schemaVersion === 'string' &&
    typeof manifest?.runtimeCompatibilityVersion === 'string' &&
    Array.isArray(manifest?.supportedTargetFamilies) &&
    Array.isArray(manifest?.capabilities) &&
    (candidate.fileName === undefined || typeof candidate.fileName === 'string')
  );
}

function isPluginLibrarySource(value: string): boolean {
  return value === 'built-in' || value === 'imported' || value === 'created';
}
