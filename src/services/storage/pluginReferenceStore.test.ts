import { describe, expect, it } from '@jest/globals';

import type { PluginReferenceOwnership, PluginValidationReport } from '../../shared/types/plugins';
import { createPluginReferenceStore, type StorageLike } from './pluginReferenceStore';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('createPluginReferenceStore', () => {
  const ownership: PluginReferenceOwnership = {
    workspaceId: 'local-workspace',
    projectId: 'plugin-runtime-validation',
    sessionId: 'dashboard-session',
  };

  const compatibleReport: PluginValidationReport = {
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
  };

  const partialReport: PluginValidationReport = {
    status: 'partially-compatible',
    manifestPath: '/tmp/plugins/nested/runtime-shim.json',
    reference: {
      pluginId: 'nested-shim-plugin',
      pluginName: 'Nested Shim Plugin',
      pluginVersion: '0.9.0',
      apiVersion: 'v1',
      schemaVersion: 'v1',
      runtimeCompatibilityVersion: 'v2',
    },
    findings: [],
  };

  it('returns an empty state when nothing has been persisted', () => {
    const store = createPluginReferenceStore(new MemoryStorage(), () => '2026-05-26T10:00:00.000Z');

    expect(store.loadState(ownership)).toEqual({
      ownership,
      pluginReferences: [],
    });
  });

  it('persists selected directory and manifest paths', () => {
    const store = createPluginReferenceStore(new MemoryStorage(), () => '2026-05-26T10:00:00.000Z');

    store.saveSelection({
      ownership,
      pluginDirectoryPath: ' /tmp/plugins ',
      manifestPath: ' /tmp/plugins/metadata.json ',
    });

    expect(store.loadState(ownership)).toEqual({
      ownership,
      pluginDirectoryPath: '/tmp/plugins',
      manifestPath: '/tmp/plugins/metadata.json',
      pluginReferences: [],
    });
  });

  it('records validation reports as persisted plugin references', () => {
    const store = createPluginReferenceStore(new MemoryStorage(), () => '2026-05-26T10:00:00.000Z');

    const nextState = store.recordReport({
      ownership,
      report: compatibleReport,
      captureMode: 'generated',
    });

    expect(nextState.pluginDirectoryPath).toBe('/tmp/plugins');
    expect(nextState.manifestPath).toBe('/tmp/plugins/metadata.json');
    expect(nextState.activePluginReferenceId).toBe(
      'edc16u31-detector::1.0.0::/tmp/plugins/metadata.json',
    );
    expect(nextState.pluginReferences).toHaveLength(1);
    expect(nextState.pluginReferences[0]).toEqual({
      id: 'edc16u31-detector::1.0.0::/tmp/plugins/metadata.json',
      manifestPath: '/tmp/plugins/metadata.json',
      directoryPath: '/tmp/plugins',
      captureMode: 'generated',
      capturedAt: '2026-05-26T10:00:00.000Z',
      report: compatibleReport,
    });
  });

  it('can switch the active persisted plugin reference', () => {
    const store = createPluginReferenceStore(new MemoryStorage(), () => '2026-05-26T10:00:00.000Z');

    store.recordReport({
      ownership,
      report: compatibleReport,
      captureMode: 'generated',
    });
    const nextState = store.recordReport({
      ownership,
      report: partialReport,
      captureMode: 'inferred',
    });

    const previousReferenceId = 'edc16u31-detector::1.0.0::/tmp/plugins/metadata.json';
    const selectedState = store.setActiveReference({
      ownership,
      referenceId: previousReferenceId,
    });

    expect(nextState.pluginReferences).toHaveLength(2);
    expect(selectedState.activePluginReferenceId).toBe(previousReferenceId);
    expect(selectedState.manifestPath).toBe('/tmp/plugins/metadata.json');
    expect(selectedState.pluginDirectoryPath).toBe('/tmp/plugins');
  });
});
