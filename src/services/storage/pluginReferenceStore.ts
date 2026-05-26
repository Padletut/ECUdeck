import type {
  PersistedPluginReference,
  PersistedPluginReferenceState,
  PluginReferenceCaptureMode,
  PluginReferenceOwnership,
  PluginValidationReport,
} from '../../shared/types/plugins';

const STORAGE_PREFIX = 'ecudeck.plugin-references.v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface SaveSelectionInput {
  ownership: PluginReferenceOwnership;
  pluginDirectoryPath?: string;
  manifestPath?: string;
}

interface RecordReportInput {
  ownership: PluginReferenceOwnership;
  pluginDirectoryPath?: string;
  manifestPath?: string;
  report: PluginValidationReport;
  captureMode: PluginReferenceCaptureMode;
}

interface SetActiveReferenceInput {
  ownership: PluginReferenceOwnership;
  referenceId: string;
}

export interface PluginReferenceStore {
  loadState(ownership: PluginReferenceOwnership): PersistedPluginReferenceState;
  saveSelection(input: SaveSelectionInput): PersistedPluginReferenceState;
  recordReport(input: RecordReportInput): PersistedPluginReferenceState;
  setActiveReference(input: SetActiveReferenceInput): PersistedPluginReferenceState;
}

export function createPluginReferenceStore(
  storage: StorageLike | null | undefined,
  now: () => string = () => new Date().toISOString(),
): PluginReferenceStore {
  return {
    loadState(ownership: PluginReferenceOwnership): PersistedPluginReferenceState {
      return loadPersistedState(storage, ownership);
    },

    saveSelection(input: SaveSelectionInput): PersistedPluginReferenceState {
      const previousState = loadPersistedState(storage, input.ownership);
      const nextState: PersistedPluginReferenceState = {
        ...previousState,
        pluginDirectoryPath:
          normalizeOptionalPath(input.pluginDirectoryPath) ?? previousState.pluginDirectoryPath,
        manifestPath: normalizeOptionalPath(input.manifestPath) ?? previousState.manifestPath,
      };

      persistState(storage, nextState);
      return nextState;
    },

    recordReport(input: RecordReportInput): PersistedPluginReferenceState {
      const previousState = loadPersistedState(storage, input.ownership);
      const manifestPath =
        normalizeOptionalPath(input.manifestPath) ??
        normalizeOptionalPath(input.report.manifestPath);
      const directoryPath =
        normalizeOptionalPath(input.pluginDirectoryPath) ??
        directoryPathFromManifestPath(manifestPath) ??
        previousState.pluginDirectoryPath;
      const nextReference = createPersistedReference({
        report: input.report,
        manifestPath,
        directoryPath,
        captureMode: input.captureMode,
        capturedAt: now(),
      });
      const nextReferences = [
        nextReference,
        ...previousState.pluginReferences.filter((reference) => reference.id !== nextReference.id),
      ];
      const nextState: PersistedPluginReferenceState = {
        ...previousState,
        pluginDirectoryPath: directoryPath,
        manifestPath: manifestPath ?? previousState.manifestPath,
        activePluginReferenceId: nextReference.id,
        pluginReferences: nextReferences,
      };

      persistState(storage, nextState);
      return nextState;
    },

    setActiveReference(input: SetActiveReferenceInput): PersistedPluginReferenceState {
      const previousState = loadPersistedState(storage, input.ownership);
      const activeReference = previousState.pluginReferences.find(
        (reference) => reference.id === input.referenceId,
      );

      if (!activeReference) {
        return previousState;
      }

      const nextState: PersistedPluginReferenceState = {
        ...previousState,
        pluginDirectoryPath: activeReference.directoryPath ?? previousState.pluginDirectoryPath,
        manifestPath: activeReference.manifestPath ?? previousState.manifestPath,
        activePluginReferenceId: activeReference.id,
      };

      persistState(storage, nextState);
      return nextState;
    },
  };
}

export const pluginReferenceStore = createPluginReferenceStore(getBrowserStorage());

function createPersistedReference({
  report,
  manifestPath,
  directoryPath,
  captureMode,
  capturedAt,
}: {
  report: PluginValidationReport;
  manifestPath?: string;
  directoryPath?: string;
  captureMode: PluginReferenceCaptureMode;
  capturedAt: string;
}): PersistedPluginReference {
  return {
    id: buildReferenceId(report, manifestPath),
    manifestPath,
    directoryPath,
    captureMode,
    capturedAt,
    report,
  };
}

function loadPersistedState(
  storage: StorageLike | null | undefined,
  ownership: PluginReferenceOwnership,
): PersistedPluginReferenceState {
  if (!storage) {
    return emptyState(ownership);
  }

  const raw = storage.getItem(storageKey(ownership));

  if (!raw) {
    return emptyState(ownership);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedPluginReferenceState>;

    return {
      ownership,
      pluginDirectoryPath:
        typeof parsed.pluginDirectoryPath === 'string' ? parsed.pluginDirectoryPath : undefined,
      manifestPath: typeof parsed.manifestPath === 'string' ? parsed.manifestPath : undefined,
      activePluginReferenceId:
        typeof parsed.activePluginReferenceId === 'string'
          ? parsed.activePluginReferenceId
          : undefined,
      pluginReferences: Array.isArray(parsed.pluginReferences)
        ? parsed.pluginReferences.filter(isPersistedPluginReference)
        : [],
    };
  } catch {
    return emptyState(ownership);
  }
}

function persistState(
  storage: StorageLike | null | undefined,
  state: PersistedPluginReferenceState,
): void {
  if (!storage) {
    return;
  }

  storage.setItem(storageKey(state.ownership), JSON.stringify(state));
}

function emptyState(ownership: PluginReferenceOwnership): PersistedPluginReferenceState {
  return {
    ownership,
    pluginReferences: [],
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

function buildReferenceId(report: PluginValidationReport, manifestPath?: string): string {
  return [
    report.reference?.pluginId ?? 'unknown-plugin',
    report.reference?.pluginVersion ?? report.status,
    manifestPath ?? 'unknown-manifest',
  ].join('::');
}

function directoryPathFromManifestPath(manifestPath?: string): string | undefined {
  const normalizedPath = normalizeOptionalPath(manifestPath);

  if (!normalizedPath) {
    return undefined;
  }

  const separatorIndex = Math.max(
    normalizedPath.lastIndexOf('/'),
    normalizedPath.lastIndexOf('\\'),
  );
  return separatorIndex > 0 ? normalizedPath.slice(0, separatorIndex) : undefined;
}

function normalizeOptionalPath(value?: string): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function isPersistedPluginReference(value: unknown): value is PersistedPluginReference {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.capturedAt === 'string' &&
    typeof candidate.captureMode === 'string' &&
    typeof candidate.report === 'object' &&
    candidate.report !== null
  );
}

function getBrowserStorage(): StorageLike | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage as unknown as StorageLike;
}
