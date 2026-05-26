import { describe, expect, it } from '@jest/globals';

import type { PluginReferenceOwnership } from '../../shared/types/plugins';
import { createFirmwareWorkspaceStore, type StorageLike } from './firmwareWorkspaceStore';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('createFirmwareWorkspaceStore', () => {
  const ownership: PluginReferenceOwnership = {
    workspaceId: 'local-workspace',
    projectId: 'dashboard-plugin-validation',
    sessionId: 'dashboard-session',
  };

  const otherOwnership: PluginReferenceOwnership = {
    workspaceId: 'local-workspace',
    projectId: 'comparison-project',
    sessionId: 'comparison-session',
  };

  it('returns an empty state when nothing has been persisted', () => {
    const store = createFirmwareWorkspaceStore(
      new MemoryStorage(),
      () => '2026-05-26T10:00:00.000Z',
    );

    expect(store.loadState(ownership)).toEqual({
      ownership,
    });
  });

  it('records the last loaded firmware summary', () => {
    const store = createFirmwareWorkspaceStore(
      new MemoryStorage(),
      () => '2026-05-26T10:00:00.000Z',
    );

    const nextState = store.recordLoadedFirmware({
      ownership,
      fileName: '  demo.bin  ',
      size: 524288,
      checksum: '  file-123  ',
    });

    expect(nextState).toEqual({
      ownership,
      lastLoadedFirmware: {
        fileName: 'demo.bin',
        size: 524288,
        checksum: 'file-123',
        loadedAt: '2026-05-26T10:00:00.000Z',
      },
    });
    expect(store.loadState(ownership)).toEqual(nextState);
  });

  it('persists summaries independently per ownership scope', () => {
    const store = createFirmwareWorkspaceStore(
      new MemoryStorage(),
      () => '2026-05-26T10:00:00.000Z',
    );

    store.recordLoadedFirmware({
      ownership,
      fileName: 'demo.bin',
      size: 524288,
      checksum: 'file-123',
    });
    store.recordLoadedFirmware({
      ownership: otherOwnership,
      fileName: 'compare.bin',
      size: 1048576,
      checksum: 'file-999',
    });

    expect(store.loadState(ownership).lastLoadedFirmware?.fileName).toBe('demo.bin');
    expect(store.loadState(otherOwnership).lastLoadedFirmware?.fileName).toBe('compare.bin');
  });
});
