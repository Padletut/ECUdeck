import { describe, expect, it } from '@jest/globals';

import type {
  AiAssistProviderConfig,
  AiAssistReviewStatus,
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

  const providerConfig: AiAssistProviderConfig = {
    providerId: 'ollama',
    modelId: 'llama3.1:8b',
  };

  const preview = buildPreview(1);

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
      previewHistory: [preview],
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
      previewHistory: [preview],
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
      previewHistory: [preview],
    });
  });

  it('keeps a bounded newest-first preview history per ownership scope', () => {
    const store = createAiAssistStore(new MemoryStorage());

    for (let index = 1; index <= 7; index += 1) {
      store.recordNativePreview({
        ownership,
        preview: buildPreview(index),
      });
    }

    expect(
      store
        .loadState(ownership)
        .previewHistory?.map((entry) => entry.snapshotResponse.snapshot.snapshotId),
    ).toEqual([
      'preview::snapshot::plan::local-workspace::4::7',
      'preview::snapshot::plan::local-workspace::4::6',
      'preview::snapshot::plan::local-workspace::4::5',
      'preview::snapshot::plan::local-workspace::4::4',
      'preview::snapshot::plan::local-workspace::4::3',
      'preview::snapshot::plan::local-workspace::4::2',
    ]);
  });

  it('restores preset and provider config from a historical preview', () => {
    const store = createAiAssistStore(new MemoryStorage());

    store.selectPreset({
      ownership,
      selectedPresetId: 'map-region-summary',
    });
    store.updateProviderConfig({
      ownership,
      providerConfig: {
        providerId: 'preview-provider',
        modelId: 'draft-preview',
      },
    });
    store.recordNativePreview({
      ownership,
      preview,
    });

    expect(
      store.restorePreviewContext({
        ownership,
        preview,
      }),
    ).toEqual({
      ownership,
      selectedPresetId: 'first-pass-review',
      providerConfig,
      lastNativePreview: preview,
      previewHistory: [preview],
    });
  });

  it('updates the review status for the matching preview entry', () => {
    const store = createAiAssistStore(new MemoryStorage());

    store.recordNativePreview({
      ownership,
      preview,
    });

    expect(
      store.updatePreviewReviewStatus({
        ownership,
        snapshotId: preview.snapshotResponse.snapshot.snapshotId,
        reviewStatus: 'accepted',
        decidedAt: '2026-05-26T11:00:00.000Z',
      }),
    ).toEqual({
      ownership,
      lastNativePreview: buildPreview(1, 'accepted', '2026-05-26T11:00:00.000Z'),
      previewHistory: [buildPreview(1, 'accepted', '2026-05-26T11:00:00.000Z')],
    });
  });

  it('defaults older persisted previews to pending review status', () => {
    const storage = new MemoryStorage();
    const store = createAiAssistStore(storage);
    const snapshotId = preview.snapshotResponse.snapshot.snapshotId;
    const proposalId = preview.chatResponse.proposal?.proposalId;

    storage.setItem(
      'ecudeck.ai-assist.v1::local-workspace::dashboard-plugin-validation::dashboard-session',
      JSON.stringify({
        ownership,
        lastNativePreview: {
          presetId: 'first-pass-review',
          draftKey: preview.draftKey,
          providerConfig,
          recordedAt: preview.recordedAt,
          snapshotResponse: {
            snapshot: {
              snapshotId,
              workspaceId: ownership.workspaceId,
              projectId: ownership.projectId,
              sessionId: ownership.sessionId,
              mode: 'plan',
              sourceRefs: [],
              summaryText: preview.snapshotResponse.snapshot.summaryText,
              unresolvedAssumptions: [],
              safetyWarnings: [],
              acceptedDecisionRefs: [],
              rejectedDecisionRefs: [],
              metadata: preview.snapshotResponse.snapshot.metadata,
            },
          },
          chatResponse: {
            responseKind: 'plan',
            summaryText: preview.chatResponse.summaryText,
            proposal: proposalId
              ? {
                  proposalId,
                  contextSnapshotId: snapshotId,
                }
              : undefined,
          },
        },
      }),
    );

    expect(store.loadState(ownership)).toEqual({
      ownership,
      lastNativePreview: preview,
      previewHistory: [preview],
    });
  });

  function buildPreview(
    index: number,
    reviewStatus: AiAssistReviewStatus = 'pending',
    decidedAt?: string,
  ): PersistedAiAssistNativePreview {
    const snapshotId = `preview::snapshot::plan::local-workspace::4::${index}`;
    const proposalId = `preview::proposal::plan::local-workspace::ollama::${index}`;

    return {
      presetId: 'first-pass-review',
      draftKey: `first-pass-review::local-workspace::dashboard-plugin-validation::dashboard-session::firmware::sample.bin::ABC123::${index}`,
      providerConfig,
      recordedAt: `2026-05-26T10:0${Math.min(index, 9)}:00.000Z`,
      reviewDecision:
        reviewStatus === 'pending'
          ? {
              status: 'pending',
            }
          : {
              status: reviewStatus,
              decidedAt: decidedAt ?? `2026-05-26T11:0${Math.min(index, 9)}:00.000Z`,
            },
      snapshotResponse: {
        snapshot: {
          snapshotId,
          workspaceId: ownership.workspaceId,
          projectId: ownership.projectId,
          sessionId: ownership.sessionId,
          mode: 'plan',
          sourceRefs: [],
          summaryText: `preview snapshot ${index}`,
          unresolvedAssumptions: [],
          safetyWarnings: [],
          acceptedDecisionRefs: reviewStatus === 'accepted' ? [proposalId] : [],
          rejectedDecisionRefs: reviewStatus === 'rejected' ? [proposalId] : [],
          reviewStatus,
          reviewedAt:
            reviewStatus === 'pending'
              ? undefined
              : (decidedAt ?? `2026-05-26T11:0${Math.min(index, 9)}:00.000Z`),
          metadata: {
            strategy: 'summary',
            status: 'fresh',
            lossy: false,
            createdAt: `2026-05-26T10:0${Math.min(index, 9)}:00.000Z`,
          },
        },
      },
      chatResponse: {
        responseKind: 'plan',
        summaryText: `preview chat ${index}`,
        reviewStatus,
        reviewedAt:
          reviewStatus === 'pending'
            ? undefined
            : (decidedAt ?? `2026-05-26T11:0${Math.min(index, 9)}:00.000Z`),
        proposal: {
          proposalId,
          contextSnapshotId: snapshotId,
          reviewStatus,
          reviewedAt:
            reviewStatus === 'pending'
              ? undefined
              : (decidedAt ?? `2026-05-26T11:0${Math.min(index, 9)}:00.000Z`),
        },
      },
    };
  }
});
