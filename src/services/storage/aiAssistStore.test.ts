import { describe, expect, it } from '@jest/globals';

import type { PluginReferenceOwnership } from '../../shared/types/plugins';
import { createAiAssistStore, type StorageLike } from './aiAssistStore';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('createAiAssistStore', () => {
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
    const store = createAiAssistStore(new MemoryStorage());

    expect(store.loadState(ownership)).toEqual({
      ownership,
    });
  });

  it('persists the selected AI preset per ownership scope', () => {
    const store = createAiAssistStore(new MemoryStorage());

    const nextState = store.selectPreset({
      ownership,
      selectedPresetId: 'first-pass-review',
    });

    expect(nextState).toEqual({
      ownership,
      selectedPresetId: 'first-pass-review',
    });
    expect(store.loadState(ownership)).toEqual(nextState);
  });

  it('isolates selected presets across scopes', () => {
    const store = createAiAssistStore(new MemoryStorage());

    store.selectPreset({
      ownership,
      selectedPresetId: 'map-region-summary',
    });
    store.selectPreset({
      ownership: otherOwnership,
      selectedPresetId: 'bosch-pattern-compare',
    });

    expect(store.loadState(ownership).selectedPresetId).toBe('map-region-summary');
    expect(store.loadState(otherOwnership).selectedPresetId).toBe('bosch-pattern-compare');
  });
});
