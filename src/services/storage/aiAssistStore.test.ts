import { describe, expect, it } from '@jest/globals';

import type {
  AiAssistMode,
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
  const surface = 'map-editor' as const;
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

  it('returns an empty state when nothing has been persisted', () => {
    const store = createAiAssistStore(new MemoryStorage());

    expect(store.loadState(ownership)).toEqual({
      ownership,
      surface,
    });
  });

  it('persists the selected mode per ownership scope', () => {
    const store = createAiAssistStore(new MemoryStorage());

    const nextState = store.updateMode({
      ownership,
      surface,
      mode: 'plan',
    });

    expect(nextState).toEqual({
      ownership,
      surface,
      selectedMode: 'plan',
    });
    expect(store.loadState(ownership)).toEqual(nextState);
  });

  it('persists the draft prompt per ownership scope', () => {
    const store = createAiAssistStore(new MemoryStorage());

    const nextState = store.updateDraftPrompt({
      ownership,
      surface,
      draftPrompt: 'Explain the selected boost target region.',
    });

    expect(nextState).toEqual({
      ownership,
      surface,
      draftPrompt: 'Explain the selected boost target region.',
    });
    expect(store.loadState(ownership)).toEqual(nextState);
  });

  it('isolates composer state across scopes', () => {
    const store = createAiAssistStore(new MemoryStorage());

    store.updateMode({
      ownership,
      surface,
      mode: 'agent',
    });
    store.updateDraftPrompt({
      ownership,
      surface,
      draftPrompt: 'Agent request for the first project.',
    });
    store.updateMode({
      ownership: otherOwnership,
      surface,
      mode: 'ask',
    });
    store.updateDraftPrompt({
      ownership: otherOwnership,
      surface,
      draftPrompt: 'Ask request for the comparison project.',
    });

    expect(store.loadState(ownership).selectedMode).toBe('agent');
    expect(store.loadState(ownership).draftPrompt).toBe('Agent request for the first project.');
    expect(store.loadState(otherOwnership).selectedMode).toBe('ask');
    expect(store.loadState(otherOwnership).draftPrompt).toBe(
      'Ask request for the comparison project.',
    );
  });

  it('records a native preview and derives a review log entry', () => {
    const store = createAiAssistStore(new MemoryStorage());
    const preview = buildPreview(1);

    const nextState = store.recordNativePreview({
      ownership,
      surface,
      preview,
    });

    expect(nextState).toEqual({
      ownership,
      surface,
      lastNativePreview: preview,
      previewHistory: [preview],
      proposalReviews: [
        {
          proposalId: 'preview::proposal::plan::local-workspace::ollama::1',
          snapshotId: 'preview::snapshot::plan::local-workspace::4::1',
          mode: 'plan',
          promptText: 'Plan the safest first-pass review for this firmware.',
          providerConfig,
          summaryText: 'Preview summary 1',
          reviewDecision: {
            status: 'pending',
            decisionType: 'needs-follow-up',
          },
          recordedAt: '2026-05-27T10:01:00.000Z',
        },
      ],
    });
  });

  it('restores mode, prompt, and provider config from a preview', () => {
    const store = createAiAssistStore(new MemoryStorage());
    const preview = buildPreview(2, 'agent', 'Prepare a stronger proposal for this plugin.');

    store.updateMode({
      ownership,
      surface,
      mode: 'ask',
    });
    store.updateDraftPrompt({
      ownership,
      surface,
      draftPrompt: 'Old prompt',
    });
    store.recordNativePreview({
      ownership,
      surface,
      preview,
    });

    expect(
      store.restorePreviewContext({
        ownership,
        surface,
        preview,
      }),
    ).toEqual({
      ownership,
      surface,
      selectedMode: 'agent',
      draftPrompt: 'Prepare a stronger proposal for this plugin.',
      lastNativePreview: preview,
      previewHistory: [preview],
      proposalReviews: [
        {
          proposalId: 'preview::proposal::plan::local-workspace::ollama::2',
          snapshotId: 'preview::snapshot::plan::local-workspace::4::2',
          mode: 'agent',
          promptText: 'Prepare a stronger proposal for this plugin.',
          providerConfig,
          summaryText: 'Preview summary 2',
          reviewDecision: {
            status: 'pending',
            decisionType: 'needs-follow-up',
          },
          recordedAt: '2026-05-27T10:02:00.000Z',
        },
      ],
      providerConfig,
    });
  });

  it('updates the review status for the matching preview entry', () => {
    const store = createAiAssistStore(new MemoryStorage());
    const preview = buildPreview(1);

    store.recordNativePreview({
      ownership,
      surface,
      preview,
    });

    const nextState = store.updatePreviewReviewStatus({
      ownership,
      surface,
      snapshotId: preview.snapshotResponse.snapshot.snapshotId,
      reviewStatus: 'accepted',
      decidedAt: '2026-05-27T11:00:00.000Z',
    });

    expect(nextState.lastNativePreview?.reviewDecision.status).toBe('accepted');
    expect(nextState.previewHistory?.[0]?.reviewDecision.status).toBe('accepted');
    expect(nextState.proposalReviews?.[0]?.reviewDecision.status).toBe('accepted');
    expect(nextState.lastNativePreview?.chatResponse.reviewStatus).toBe('accepted');
  });

  it('migrates older preset-based preview payloads into mode-and-prompt previews', () => {
    const storage = new MemoryStorage();
    const store = createAiAssistStore(storage);

    storage.setItem(
      'ecudeck.ai-assist.v1::map-editor::local-workspace::dashboard-plugin-validation::dashboard-session',
      JSON.stringify({
        ownership,
        surface,
        lastNativePreview: {
          presetId: 'first-pass-review',
          draftKey:
            'first-pass-review::local-workspace::dashboard-plugin-validation::dashboard-session::firmware::sample.bin::ABC123::1',
          providerConfig,
          recordedAt: '2026-05-27T10:01:00.000Z',
          snapshotResponse: buildPreview(1).snapshotResponse,
          chatResponse: buildPreview(1).chatResponse,
        },
      }),
    );

    expect(store.loadState(ownership)).toEqual({
      ownership,
      surface,
      lastNativePreview: {
        ...buildPreview(1),
        draftKey:
          'first-pass-review::local-workspace::dashboard-plugin-validation::dashboard-session::firmware::sample.bin::ABC123::1',
        prompt:
          'Generate a first-pass review plan for this firmware scope, including the safest deterministic checks to run before deeper analysis.',
      },
      previewHistory: [
        {
          ...buildPreview(1),
          draftKey:
            'first-pass-review::local-workspace::dashboard-plugin-validation::dashboard-session::firmware::sample.bin::ABC123::1',
          prompt:
            'Generate a first-pass review plan for this firmware scope, including the safest deterministic checks to run before deeper analysis.',
        },
      ],
      proposalReviews: [
        {
          proposalId: 'preview::proposal::plan::local-workspace::ollama::1',
          snapshotId: 'preview::snapshot::plan::local-workspace::4::1',
          mode: 'plan',
          promptText:
            'Generate a first-pass review plan for this firmware scope, including the safest deterministic checks to run before deeper analysis.',
          providerConfig,
          summaryText: 'Preview summary 1',
          reviewDecision: {
            status: 'pending',
            decisionType: 'needs-follow-up',
          },
          recordedAt: '2026-05-27T10:01:00.000Z',
        },
      ],
    });
  });

  function buildPreview(
    index: number,
    mode: AiAssistMode = 'plan',
    prompt = 'Plan the safest first-pass review for this firmware.',
    reviewStatus: AiAssistReviewStatus = 'pending',
  ): PersistedAiAssistNativePreview {
    const snapshotId = `preview::snapshot::plan::local-workspace::4::${index}`;
    const proposalId = `preview::proposal::plan::local-workspace::ollama::${index}`;

    return {
      mode,
      prompt,
      draftKey: `${surface}::${mode}::${prompt}::${index}`,
      providerConfig,
      recordedAt: `2026-05-27T10:0${Math.min(index, 9)}:00.000Z`,
      reviewDecision:
        reviewStatus === 'pending'
          ? {
              status: 'pending',
              decisionType: 'needs-follow-up',
            }
          : {
              status: reviewStatus,
              decisionType: reviewStatus === 'accepted' ? 'approve' : 'reject',
              decidedAt: `2026-05-27T11:0${Math.min(index, 9)}:00.000Z`,
            },
      snapshotResponse: {
        snapshot: {
          snapshotId,
          workspaceId: ownership.workspaceId,
          projectId: ownership.projectId,
          sessionId: ownership.sessionId,
          mode,
          sourceRefs: [],
          summaryText: `Snapshot summary ${index}`,
          unresolvedAssumptions: [],
          safetyWarnings: [],
          acceptedDecisionRefs: reviewStatus === 'accepted' ? [proposalId] : [],
          rejectedDecisionRefs: reviewStatus === 'rejected' ? [proposalId] : [],
          reviewStatus,
          reviewedAt:
            reviewStatus === 'pending' ? undefined : `2026-05-27T11:0${Math.min(index, 9)}:00.000Z`,
          metadata: {
            strategy: 'summary',
            status: 'fresh',
            lossy: false,
            createdAt: `2026-05-27T10:0${Math.min(index, 9)}:00.000Z`,
          },
        },
      },
      chatResponse: {
        responseKind: mode === 'ask' ? 'explanation' : mode === 'plan' ? 'plan' : 'proposal',
        summaryText: `Preview summary ${index}`,
        reviewStatus,
        reviewedAt:
          reviewStatus === 'pending' ? undefined : `2026-05-27T11:0${Math.min(index, 9)}:00.000Z`,
        proposal: {
          proposalId,
          contextSnapshotId: snapshotId,
          reviewStatus,
          reviewedAt:
            reviewStatus === 'pending' ? undefined : `2026-05-27T11:0${Math.min(index, 9)}:00.000Z`,
        },
      },
    };
  }
});
