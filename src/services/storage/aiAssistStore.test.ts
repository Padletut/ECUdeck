import { describe, expect, it } from '@jest/globals';

import type {
  AiAssistProviderConfig,
  PersistedAiAssistNativePreview,
} from '../../shared/types/aiAssist';
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

  const preview: PersistedAiAssistNativePreview = {
    draftKey:
      'first-pass-review::local-workspace::dashboard-plugin-validation::dashboard-session::firmware::sample.bin::ABC123',
    snapshotResponse: {
      snapshot: {
        snapshotId: 'preview::snapshot::plan::local-workspace::4::1',
        workspaceId: ownership.workspaceId,
        projectId: ownership.projectId,
        sessionId: ownership.sessionId,
        mode: 'plan',
        sourceRefs: [],
        summaryText: 'preview snapshot',
        unresolvedAssumptions: [],
        safetyWarnings: [],
        acceptedDecisionRefs: [],
        rejectedDecisionRefs: [],
        metadata: {
          strategy: 'summary',
          status: 'fresh',
          lossy: false,
          createdAt: 'preview-generated',
        },
      },
    },
    chatResponse: {
      responseKind: 'plan',
      summaryText: 'preview chat',
    },
  };

  const providerConfig: AiAssistProviderConfig = {
    providerId: 'ollama',
    modelId: 'llama3.1:8b',
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

  it('persists the last native preview per ownership scope', () => {
    const store = createAiAssistStore(new MemoryStorage());

    const nextState = store.recordNativePreview({
      ownership,
      preview,
    });

    expect(nextState).toEqual({
      ownership,
      lastNativePreview: preview,
    });
    expect(store.loadState(ownership)).toEqual(nextState);
  });

  it('preserves the last native preview when selecting a preset', () => {
    const store = createAiAssistStore(new MemoryStorage());

    store.recordNativePreview({
      ownership,
      preview,
    });

    expect(
      store.selectPreset({
        ownership,
        selectedPresetId: 'first-pass-review',
      }),
    ).toEqual({
      ownership,
      selectedPresetId: 'first-pass-review',
      lastNativePreview: preview,
    });
  });

  it('persists the provider configuration per ownership scope', () => {
    const store = createAiAssistStore(new MemoryStorage());

    const nextState = store.updateProviderConfig({
      ownership,
      providerConfig,
    });

    expect(nextState).toEqual({
      ownership,
      providerConfig,
    });
    expect(store.loadState(ownership)).toEqual(nextState);
  });

  it('preserves provider configuration when recording a native preview', () => {
    const store = createAiAssistStore(new MemoryStorage());

    store.updateProviderConfig({
      ownership,
      providerConfig,
    });

    expect(
      store.recordNativePreview({
        ownership,
        preview,
      }),
    ).toEqual({
      ownership,
      providerConfig,
      lastNativePreview: preview,
    });
  });
});
