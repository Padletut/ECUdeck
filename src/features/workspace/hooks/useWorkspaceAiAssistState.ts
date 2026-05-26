import { useEffect, useMemo, useState } from 'react';

import { aiAssistStore } from '../../../services/storage/aiAssistStore';
import {
  DEFAULT_AI_ASSIST_MODEL_ID,
  DEFAULT_AI_ASSIST_PROVIDER_ID,
  type AiAssistMode,
  type AiAssistProviderConfig,
  type AiAssistDraft,
  type AiAssistReviewDecisionDetails,
  type AiAssistReviewStatus,
  type AiAssistSurface,
  type PersistedAiAssistNativePreview,
  type PersistedAiAssistProposalReview,
  type PersistedAiAssistState,
} from '../../../shared/types/aiAssist';
import type {
  ContextSourceKind,
  PrepareContextSnapshotResponse,
  SendAiChatResponse,
} from '../../../shared/types/aiContext';
import type { PersistedFirmwareSummary } from '../../../shared/types/ecu';
import type { PluginReferenceOwnership } from '../../../shared/types/plugins';

interface AiAssistState {
  surface: AiAssistSurface;
  mode: AiAssistMode;
  draftPrompt: string;
  draft: AiAssistDraft | null;
  providerConfig: AiAssistProviderConfig;
  nativePreview: PersistedAiAssistNativePreview | null;
  previewHistory: PersistedAiAssistNativePreview[];
  proposalReviews: PersistedAiAssistProposalReview[];
  updateMode: (mode: AiAssistMode) => void;
  updateDraftPrompt: (draftPrompt: string) => void;
  updateProviderConfig: (providerId: string, modelId?: string) => void;
  restorePreviewContext: (preview: PersistedAiAssistNativePreview) => void;
  updatePreviewReviewStatus: (
    snapshotId: string,
    reviewStatus: AiAssistReviewStatus,
    reviewDetails?: AiAssistReviewDecisionDetails,
  ) => void;
  recordNativePreview: (
    snapshotResponse: PrepareContextSnapshotResponse,
    chatResponse: SendAiChatResponse,
  ) => void;
}

export function useAiAssistState(
  ownership: PluginReferenceOwnership,
  lastLoadedFirmware: PersistedFirmwareSummary | null,
  surface: AiAssistSurface,
): AiAssistState {
  const [persistedState, setPersistedState] = useState<PersistedAiAssistState>(() =>
    aiAssistStore.loadState({ ownership, surface }),
  );

  useEffect(() => {
    setPersistedState(aiAssistStore.loadState({ ownership, surface }));
  }, [ownership.workspaceId, ownership.projectId, ownership.sessionId, surface]);

  const mode = persistedState.selectedMode ?? 'ask';
  const draftPrompt = persistedState.draftPrompt ?? '';

  const draft = useMemo<AiAssistDraft | null>(() => {
    const normalizedPrompt = draftPrompt.trim();

    if (!normalizedPrompt) {
      return null;
    }

    const contextKinds: ContextSourceKind[] = ['workspace-metadata'];

    if (ownership.projectId) {
      contextKinds.push('project-metadata');
    }

    if (ownership.sessionId) {
      contextKinds.push('session-metadata');
    }

    if (lastLoadedFirmware) {
      contextKinds.push('firmware-summary');
    }

    if (surface === 'map-editor') {
      contextKinds.push('map-selection');
    } else {
      contextKinds.push('plugin-reference', 'plugin-validation');
    }

    return {
      surface,
      mode,
      prompt: normalizedPrompt,
      ownership: {
        workspaceId: ownership.workspaceId,
        projectId: ownership.projectId,
        sessionId: ownership.sessionId,
        firmwareIds: lastLoadedFirmware ? [buildFirmwareId(lastLoadedFirmware)] : undefined,
      },
      contextKinds,
      firmwareSummary: lastLoadedFirmware ?? undefined,
    };
  }, [
    draftPrompt,
    lastLoadedFirmware,
    mode,
    ownership.projectId,
    ownership.sessionId,
    ownership.workspaceId,
    surface,
  ]);

  const providerConfig = useMemo(
    () => resolveProviderConfig(persistedState.providerConfig),
    [persistedState.providerConfig],
  );

  const currentDraftKey = useMemo(
    () => (draft ? buildDraftKey(draft, providerConfig) : null),
    [draft, providerConfig.providerId, providerConfig.modelId],
  );

  const nativePreview = useMemo(() => {
    if (!currentDraftKey || !persistedState.lastNativePreview) {
      return null;
    }

    return persistedState.lastNativePreview.draftKey === currentDraftKey
      ? persistedState.lastNativePreview
      : null;
  }, [currentDraftKey, persistedState.lastNativePreview]);

  const previewHistory = useMemo(
    () =>
      persistedState.previewHistory ??
      (persistedState.lastNativePreview ? [persistedState.lastNativePreview] : []),
    [persistedState.previewHistory, persistedState.lastNativePreview],
  );

  const proposalReviews = useMemo(
    () => persistedState.proposalReviews ?? [],
    [persistedState.proposalReviews],
  );

  return {
    surface,
    mode,
    draftPrompt,
    draft,
    providerConfig,
    nativePreview,
    previewHistory,
    proposalReviews,
    updateMode: (nextMode: AiAssistMode) => {
      const nextState = aiAssistStore.updateMode({
        ownership,
        surface,
        mode: nextMode,
      });
      setPersistedState(nextState);
    },
    updateDraftPrompt: (nextDraftPrompt: string) => {
      const nextState = aiAssistStore.updateDraftPrompt({
        ownership,
        surface,
        draftPrompt: nextDraftPrompt,
      });
      setPersistedState(nextState);
    },
    updateProviderConfig: (providerId: string, modelId?: string) => {
      const nextState = aiAssistStore.updateProviderConfig({
        ownership,
        surface,
        providerConfig: {
          providerId,
          modelId,
        },
      });
      setPersistedState(nextState);
    },
    restorePreviewContext: (preview: PersistedAiAssistNativePreview) => {
      const nextState = aiAssistStore.restorePreviewContext({
        ownership,
        surface,
        preview,
      });
      setPersistedState(nextState);
    },
    updatePreviewReviewStatus: (
      snapshotId: string,
      reviewStatus: AiAssistReviewStatus,
      reviewDetails?: AiAssistReviewDecisionDetails,
    ) => {
      const nextState = aiAssistStore.updatePreviewReviewStatus({
        ownership,
        surface,
        snapshotId,
        reviewStatus,
        reviewDetails,
      });
      setPersistedState(nextState);
    },
    recordNativePreview: (
      snapshotResponse: PrepareContextSnapshotResponse,
      chatResponse: SendAiChatResponse,
    ) => {
      if (!currentDraftKey || !draft) {
        return;
      }

      const nextState = aiAssistStore.recordNativePreview({
        ownership,
        surface,
        preview: {
          mode: draft.mode,
          prompt: draft.prompt,
          draftKey: currentDraftKey,
          providerConfig,
          recordedAt: new Date().toISOString(),
          reviewDecision: {
            status: 'pending',
            decisionType: 'needs-follow-up',
          },
          snapshotResponse,
          chatResponse,
        },
      });
      setPersistedState(nextState);
    },
  };
}

function buildFirmwareId(summary: PersistedFirmwareSummary): string {
  return ['firmware', summary.fileName, summary.checksum ?? String(summary.size)].join('::');
}

function buildDraftKey(draft: AiAssistDraft, providerConfig: AiAssistProviderConfig): string {
  return [
    draft.surface,
    draft.mode,
    draft.ownership.workspaceId,
    draft.ownership.projectId ?? '_',
    draft.ownership.sessionId ?? '_',
    draft.ownership.firmwareIds?.join('|') ?? '_',
    draft.contextKinds.join('|'),
    draft.prompt,
    providerConfig.providerId,
    providerConfig.modelId ?? '_',
  ].join('::');
}

function resolveProviderConfig(providerConfig?: AiAssistProviderConfig): AiAssistProviderConfig {
  const providerId = providerConfig?.providerId?.trim() || DEFAULT_AI_ASSIST_PROVIDER_ID;
  const modelId = providerConfig?.modelId?.trim();

  return {
    providerId,
    modelId:
      modelId || providerId === DEFAULT_AI_ASSIST_PROVIDER_ID
        ? modelId || DEFAULT_AI_ASSIST_MODEL_ID
        : undefined,
  };
}
