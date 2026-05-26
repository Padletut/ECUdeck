import { useState } from 'react';

import { pluginService } from '../../../services/tauri';
import type {
  PluginCommandError,
  PluginManifestDiscoveryResult,
  PluginValidationReport,
} from '../../../shared/types/plugins';

interface PluginManifestValidationState {
  pluginDirectoryPath: string;
  manifestPath: string;
  discovery: PluginManifestDiscoveryResult | null;
  report: PluginValidationReport | null;
  errorMessage: string | null;
  isDiscovering: boolean;
  isValidating: boolean;
  canDiscover: boolean;
  canValidate: boolean;
  setPluginDirectoryPath: (value: string) => void;
  setManifestPath: (value: string) => void;
  discoverManifests: () => Promise<void>;
  selectManifestReport: (nextReport: PluginValidationReport) => void;
  validateManifest: () => Promise<void>;
}

export function usePluginManifestValidation(
  initialManifestPath = '',
): PluginManifestValidationState {
  const [pluginDirectoryPath, setPluginDirectoryPath] = useState('');
  const [manifestPath, setManifestPath] = useState(initialManifestPath);
  const [discovery, setDiscovery] = useState<PluginManifestDiscoveryResult | null>(null);
  const [report, setReport] = useState<PluginValidationReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const discoverManifests = async () => {
    const normalizedDirectoryPath = pluginDirectoryPath.trim();

    setIsDiscovering(true);
    setErrorMessage(null);

    try {
      const nextDiscovery = await pluginService.discoverPluginManifests(normalizedDirectoryPath);
      setDiscovery(nextDiscovery);
    } catch (error) {
      setDiscovery(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDiscovering(false);
    }
  };

  const validateManifest = async () => {
    const normalizedPath = manifestPath.trim();

    setIsValidating(true);
    setErrorMessage(null);

    try {
      const nextReport = await pluginService.validatePluginManifest(normalizedPath);
      setReport(nextReport);
    } catch (error) {
      setReport(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsValidating(false);
    }
  };

  const selectManifestReport = (nextReport: PluginValidationReport) => {
    setManifestPath(nextReport.manifestPath ?? '');
    setReport(nextReport);
    setErrorMessage(null);
  };

  return {
    pluginDirectoryPath,
    manifestPath,
    discovery,
    report,
    errorMessage,
    isDiscovering,
    isValidating,
    canDiscover: pluginDirectoryPath.trim().length > 0 && !isDiscovering,
    canValidate: manifestPath.trim().length > 0 && !isValidating,
    setPluginDirectoryPath,
    setManifestPath,
    discoverManifests,
    selectManifestReport,
    validateManifest,
  };
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
