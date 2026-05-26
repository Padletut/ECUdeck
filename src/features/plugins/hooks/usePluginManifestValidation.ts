import { useEffect, useRef, useState } from 'react';

import { dialogService, pluginService } from '../../../services/tauri';
import { pluginReferenceStore } from '../../../services/storage/pluginReferenceStore';
import type {
  PersistedPluginReference,
  PersistedPluginReferenceState,
  PluginCommandError,
  PluginManifestDiscoveryResult,
  PluginReferenceOwnership,
  PluginValidationReport,
} from '../../../shared/types/plugins';

interface PluginManifestValidationState {
  pluginDirectoryPath: string;
  manifestPath: string;
  discovery: PluginManifestDiscoveryResult | null;
  pluginReferences: PersistedPluginReference[];
  activePluginReferenceId: string | null;
  report: PluginValidationReport | null;
  errorMessage: string | null;
  isPickingDirectory: boolean;
  isPickingManifest: boolean;
  isDiscovering: boolean;
  isValidating: boolean;
  canDiscover: boolean;
  canValidate: boolean;
  setPluginDirectoryPath: (value: string) => void;
  setManifestPath: (value: string) => void;
  pickPluginDirectory: () => Promise<void>;
  pickManifestFile: () => Promise<void>;
  discoverManifests: (nextDirectoryPath?: string) => Promise<void>;
  selectPersistedReference: (referenceId: string) => void;
  selectManifestReport: (nextReport: PluginValidationReport) => void;
  validateManifest: (nextManifestPath?: string) => Promise<void>;
}

export function usePluginManifestValidation(
  ownership: PluginReferenceOwnership,
  initialManifestPath = '',
): PluginManifestValidationState {
  const initialPersistedStateRef = useRef<PersistedPluginReferenceState | null>(null);

  if (initialPersistedStateRef.current === null) {
    initialPersistedStateRef.current = pluginReferenceStore.loadState(ownership);
  }

  const initialPersistedState = initialPersistedStateRef.current;
  const [pluginDirectoryPath, setPluginDirectoryPathState] = useState(
    initialPersistedState.pluginDirectoryPath ?? '',
  );
  const [manifestPath, setManifestPathState] = useState(
    initialPersistedState.manifestPath ?? initialManifestPath,
  );
  const [discovery, setDiscovery] = useState<PluginManifestDiscoveryResult | null>(null);
  const [pluginReferences, setPluginReferences] = useState(initialPersistedState.pluginReferences);
  const [activePluginReferenceId, setActivePluginReferenceId] = useState(
    initialPersistedState.activePluginReferenceId ?? null,
  );
  const [report, setReport] = useState<PluginValidationReport | null>(
    getActiveReport(initialPersistedState),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPickingDirectory, setIsPickingDirectory] = useState(false);
  const [isPickingManifest, setIsPickingManifest] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const nextState = pluginReferenceStore.loadState(ownership);

    applyPersistedState(nextState, initialManifestPath);
    setDiscovery(null);
    setErrorMessage(null);
  }, [ownership.workspaceId, ownership.projectId, ownership.sessionId, initialManifestPath]);

  const setPluginDirectoryPath = (value: string) => {
    setPluginDirectoryPathState(value);
    pluginReferenceStore.saveSelection({
      ownership,
      pluginDirectoryPath: value,
    });
  };

  const setManifestPath = (value: string) => {
    setManifestPathState(value);
    pluginReferenceStore.saveSelection({
      ownership,
      manifestPath: value,
    });
  };

  const discoverManifests = async (nextDirectoryPath?: string) => {
    const normalizedDirectoryPath = (nextDirectoryPath ?? pluginDirectoryPath).trim();

    setIsDiscovering(true);
    setErrorMessage(null);

    try {
      const nextDiscovery = await pluginService.discoverPluginManifests(normalizedDirectoryPath);
      const nextState = pluginReferenceStore.saveSelection({
        ownership,
        pluginDirectoryPath: normalizedDirectoryPath,
      });

      applyPersistedState(nextState);
      setDiscovery(nextDiscovery);
    } catch (error) {
      setDiscovery(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDiscovering(false);
    }
  };

  const pickPluginDirectory = async () => {
    setIsPickingDirectory(true);
    setErrorMessage(null);

    try {
      const selectedDirectoryPath = await dialogService.pickDirectory(
        pluginDirectoryPath || undefined,
      );

      if (!selectedDirectoryPath) {
        return;
      }

      await discoverManifests(selectedDirectoryPath);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsPickingDirectory(false);
    }
  };

  const validateManifest = async (nextManifestPath?: string) => {
    const normalizedPath = (nextManifestPath ?? manifestPath).trim();

    setIsValidating(true);
    setErrorMessage(null);

    try {
      const nextReport = await pluginService.validatePluginManifest(normalizedPath);
      const nextState = pluginReferenceStore.recordReport({
        ownership,
        pluginDirectoryPath,
        manifestPath: normalizedPath,
        report: nextReport,
        captureMode: 'generated',
      });

      applyPersistedState(nextState);
    } catch (error) {
      setReport(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsValidating(false);
    }
  };

  const pickManifestFile = async () => {
    setIsPickingManifest(true);
    setErrorMessage(null);

    try {
      const selectedManifestPath = await dialogService.pickManifestFile(
        manifestPath || pluginDirectoryPath || undefined,
      );

      if (!selectedManifestPath) {
        return;
      }

      await validateManifest(selectedManifestPath);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsPickingManifest(false);
    }
  };

  const selectPersistedReference = (referenceId: string) => {
    const nextState = pluginReferenceStore.setActiveReference({
      ownership,
      referenceId,
    });

    applyPersistedState(nextState);
    setErrorMessage(null);
  };

  const selectManifestReport = (nextReport: PluginValidationReport) => {
    const nextState = pluginReferenceStore.recordReport({
      ownership,
      pluginDirectoryPath,
      manifestPath: nextReport.manifestPath,
      report: nextReport,
      captureMode: 'inferred',
    });

    applyPersistedState(nextState);
    setErrorMessage(null);
  };

  const applyPersistedState = (
    nextState: PersistedPluginReferenceState,
    fallbackManifestPath = '',
  ) => {
    setPluginDirectoryPathState(nextState.pluginDirectoryPath ?? '');
    setManifestPathState(nextState.manifestPath ?? fallbackManifestPath);
    setPluginReferences(nextState.pluginReferences);
    setActivePluginReferenceId(nextState.activePluginReferenceId ?? null);
    setReport(getActiveReport(nextState));
  };

  return {
    pluginDirectoryPath,
    manifestPath,
    discovery,
    pluginReferences,
    activePluginReferenceId,
    report,
    errorMessage,
    isPickingDirectory,
    isPickingManifest,
    isDiscovering,
    isValidating,
    canDiscover: pluginDirectoryPath.trim().length > 0 && !isDiscovering && !isPickingDirectory,
    canValidate: manifestPath.trim().length > 0 && !isValidating && !isPickingManifest,
    setPluginDirectoryPath,
    setManifestPath,
    pickPluginDirectory,
    pickManifestFile,
    discoverManifests,
    selectPersistedReference,
    selectManifestReport,
    validateManifest,
  };
}

function getActiveReport(state: PersistedPluginReferenceState): PluginValidationReport | null {
  if (!state.activePluginReferenceId) {
    return null;
  }

  return (
    state.pluginReferences.find((reference) => reference.id === state.activePluginReferenceId)
      ?.report ?? null
  );
}

function getErrorMessage(error: unknown): string {
  if (isPluginCommandError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Plugin validation failed.';
}

function isPluginCommandError(error: unknown): error is PluginCommandError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}
