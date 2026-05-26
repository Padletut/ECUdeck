import { describe, expect, it, jest } from '@jest/globals';

import type {
  PluginManifestDiscoveryResult,
  PluginValidationReport,
} from '../../shared/types/plugins';
import { createPluginService, type TauriInvoke } from './pluginService';

describe('createPluginService', () => {
  it('passes a trimmed directory path to the discovery command', async () => {
    const discovery: PluginManifestDiscoveryResult = {
      directoryPath: '/tmp/plugins',
      reports: [
        {
          status: 'compatible',
          manifestPath: '/tmp/plugins/metadata.json',
          reference: {
            pluginId: 'edc16u31-detector',
            pluginName: 'EDC16U31 Detector',
            pluginVersion: '1.0.0',
            apiVersion: 'v1',
            schemaVersion: 'v1',
            runtimeCompatibilityVersion: 'v1',
          },
          findings: [],
        },
      ],
    };
    const invokeCommand = jest.fn(async () => ({ discovery }));
    const service = createPluginService(invokeCommand as unknown as TauriInvoke);

    await expect(service.discoverPluginManifests('  /tmp/plugins  ')).resolves.toEqual(discovery);
    expect(invokeCommand).toHaveBeenCalledWith('discover_plugin_manifests', {
      request: {
        directoryPath: '/tmp/plugins',
      },
    });
  });

  it('rejects empty directory paths before invoking Tauri', async () => {
    const invokeCommand = jest.fn(async () => undefined);
    const service = createPluginService(invokeCommand as unknown as TauriInvoke);

    await expect(service.discoverPluginManifests('   ')).rejects.toEqual({
      code: 'invalid-plugin-directory',
      message: 'directoryPath must be a non-empty path string.',
    });
    expect(invokeCommand).not.toHaveBeenCalled();
  });

  it('passes a trimmed manifest path to the Tauri command', async () => {
    const report: PluginValidationReport = {
      status: 'compatible',
      manifestPath: '/tmp/metadata.json',
      reference: {
        pluginId: 'edc16u31-detector',
        pluginName: 'EDC16U31 Detector',
        pluginVersion: '1.0.0',
        apiVersion: 'v1',
        schemaVersion: 'v1',
        runtimeCompatibilityVersion: 'v1',
      },
      findings: [],
    };
    const invokeCommand = jest.fn(async () => ({ report }));
    const service = createPluginService(invokeCommand as unknown as TauriInvoke);

    await expect(service.validatePluginManifest('  /tmp/metadata.json  ')).resolves.toEqual(report);
    expect(invokeCommand).toHaveBeenCalledWith('validate_plugin_manifest', {
      request: {
        manifestPath: '/tmp/metadata.json',
      },
    });
  });

  it('rejects empty manifest paths before invoking Tauri', async () => {
    const invokeCommand = jest.fn(async () => undefined);
    const service = createPluginService(invokeCommand as unknown as TauriInvoke);

    await expect(service.validatePluginManifest('   ')).rejects.toEqual({
      code: 'invalid-manifest-path',
      message: 'manifestPath must be a non-empty path string.',
    });
    expect(invokeCommand).not.toHaveBeenCalled();
  });

  it('normalizes thrown errors into a plugin command error shape', async () => {
    const invokeCommand = jest.fn(async () => {
      throw new Error('bridge failed');
    });
    const service = createPluginService(invokeCommand as unknown as TauriInvoke);

    await expect(service.validatePluginManifest('/tmp/metadata.json')).rejects.toEqual({
      code: 'plugin-command-failed',
      message: 'bridge failed',
    });
  });

  it('normalizes discovery errors into a plugin command error shape', async () => {
    const invokeCommand = jest.fn(async () => {
      throw new Error('directory scan failed');
    });
    const service = createPluginService(invokeCommand as unknown as TauriInvoke);

    await expect(service.discoverPluginManifests('/tmp/plugins')).rejects.toEqual({
      code: 'plugin-command-failed',
      message: 'directory scan failed',
    });
  });
});
