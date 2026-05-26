import type {
  DiscoverPluginManifestsResponse,
  PluginCommandError,
  PluginManifestDiscoveryResult,
  PluginValidationReport,
  ValidatePluginManifestResponse,
} from '../../shared/types/plugins';

export type TauriInvoke = <Response>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<Response>;

export interface PluginService {
  discoverPluginManifests(directoryPath: string): Promise<PluginManifestDiscoveryResult>;
  validatePluginManifest(manifestPath: string): Promise<PluginValidationReport>;
}

export function createPluginService(invokeCommand: TauriInvoke): PluginService {
  return {
    async discoverPluginManifests(directoryPath: string): Promise<PluginManifestDiscoveryResult> {
      const normalizedPath = directoryPath.trim();

      if (!normalizedPath) {
        throw invalidDirectoryPathError();
      }

      try {
        const response = await invokeCommand<DiscoverPluginManifestsResponse>(
          'discover_plugin_manifests',
          {
            request: {
              directoryPath: normalizedPath,
            },
          },
        );

        return response.discovery;
      } catch (error) {
        throw normalizePluginCommandError(error);
      }
    },

    async validatePluginManifest(manifestPath: string): Promise<PluginValidationReport> {
      const normalizedPath = manifestPath.trim();

      if (!normalizedPath) {
        throw invalidManifestPathError();
      }

      try {
        const response = await invokeCommand<ValidatePluginManifestResponse>(
          'validate_plugin_manifest',
          {
            request: {
              manifestPath: normalizedPath,
            },
          },
        );

        return response.report;
      } catch (error) {
        throw normalizePluginCommandError(error);
      }
    },
  };
}

function invalidDirectoryPathError(): PluginCommandError {
  return {
    code: 'invalid-plugin-directory',
    message: 'directoryPath must be a non-empty path string.',
  };
}

function invalidManifestPathError(): PluginCommandError {
  return {
    code: 'invalid-manifest-path',
    message: 'manifestPath must be a non-empty path string.',
  };
}

function normalizePluginCommandError(error: unknown): PluginCommandError {
  if (isPluginCommandError(error)) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      code: 'plugin-command-failed',
      message: error.message,
    };
  }

  return {
    code: 'plugin-command-failed',
    message: 'Plugin command failed.',
  };
}

function isPluginCommandError(error: unknown): error is PluginCommandError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}
