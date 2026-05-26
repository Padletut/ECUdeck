import { useEffect, useMemo, useState } from 'react';

import { aiAssistStore } from '../../../services/storage/aiAssistStore';
import type {
  AiAssistDraft,
  AiAssistPreset,
  AiAssistPresetId,
  PersistedAiAssistNativePreview,
  PersistedAiAssistState,
} from '../../../shared/types/aiAssist';
import type {
  PrepareContextSnapshotResponse,
  SendAiChatResponse,
} from '../../../shared/types/aiContext';
import type { PersistedFirmwareSummary } from '../../../shared/types/ecu';
import type { PluginReferenceOwnership } from '../../../shared/types/plugins';

const aiAssistPresets: AiAssistPreset[] = [
  {
    id: 'map-region-summary',
    title: 'Summarize likely map regions',
    prompt:
      'Summarize likely map regions in the current firmware scope and explain which areas deserve deterministic follow-up first.',
    mode: 'ask',
  },
  {
    id: 'bosch-pattern-compare',
    title: 'Compare this file against common Bosch patterns',
    prompt:
      'Compare the current firmware context against common Bosch patterns and highlight the strongest matches plus any mismatches that matter.',
    mode: 'ask',
  },
  {
    id: 'first-pass-review',
    title: 'Generate a first-pass review plan',
    prompt:
      'Generate a first-pass review plan for this firmware scope, including the safest deterministic checks to run before deeper analysis.',
    mode: 'plan',
  },
];

interface WorkspaceAiAssistState {
  presets: AiAssistPreset[];
  selectedPresetId: AiAssistPresetId | null;
  selectedPreset: AiAssistPreset | null;
  draft: AiAssistDraft | null;
  nativePreview: PersistedAiAssistNativePreview | null;
  selectPreset: (presetId: AiAssistPresetId) => void;
  recordNativePreview: (
    snapshotResponse: PrepareContextSnapshotResponse,
    chatResponse: SendAiChatResponse,
  ) => void;
}

export function useWorkspaceAiAssistState(
  ownership: PluginReferenceOwnership,
  lastLoadedFirmware: PersistedFirmwareSummary | null,
): WorkspaceAiAssistState {
  const [persistedState, setPersistedState] = useState<PersistedAiAssistState>(() =>
    aiAssistStore.loadState(ownership),
  );

  const selectedPresetId = persistedState.selectedPresetId ?? null;

  useEffect(() => {
    setPersistedState(aiAssistStore.loadState(ownership));
  }, [ownership.workspaceId, ownership.projectId, ownership.sessionId]);

  const selectedPreset = useMemo(
    () => aiAssistPresets.find((preset) => preset.id === selectedPresetId) ?? null,
    [selectedPresetId],
  );

  const draft = useMemo<AiAssistDraft | null>(() => {
    if (!selectedPreset) {
      return null;
    }

    return {
      preset: selectedPreset,
      ownership: {
        workspaceId: ownership.workspaceId,
        projectId: ownership.projectId,
        sessionId: ownership.sessionId,
        firmwareIds: lastLoadedFirmware ? [buildFirmwareId(lastLoadedFirmware)] : undefined,
      },
      contextKinds: [
        'workspace-metadata',
        ...(ownership.projectId ? (['project-metadata'] as const) : []),
        ...(ownership.sessionId ? (['session-metadata'] as const) : []),
        ...(lastLoadedFirmware ? (['firmware-summary'] as const) : []),
      ],
      firmwareSummary: lastLoadedFirmware ?? undefined,
    };
  }, [
    selectedPreset,
    ownership.workspaceId,
    ownership.projectId,
    ownership.sessionId,
    lastLoadedFirmware,
  ]);

  const currentDraftKey = useMemo(() => (draft ? buildDraftKey(draft) : null), [draft]);

  const nativePreview = useMemo(() => {
    if (!currentDraftKey || !persistedState.lastNativePreview) {
      return null;
    }

    return persistedState.lastNativePreview.draftKey === currentDraftKey
      ? persistedState.lastNativePreview
      : null;
  }, [currentDraftKey, persistedState.lastNativePreview]);

  return {
    presets: aiAssistPresets,
    selectedPresetId,
    selectedPreset,
    draft,
    nativePreview,
    selectPreset: (presetId: AiAssistPresetId) => {
      const nextState = aiAssistStore.selectPreset({
        ownership,
        selectedPresetId: presetId,
      });
      setPersistedState(nextState);
    },
    recordNativePreview: (
      snapshotResponse: PrepareContextSnapshotResponse,
      chatResponse: SendAiChatResponse,
    ) => {
      if (!currentDraftKey) {
        return;
      }

      const nextState = aiAssistStore.recordNativePreview({
        ownership,
        preview: {
          draftKey: currentDraftKey,
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

function buildDraftKey(draft: AiAssistDraft): string {
  return [
    draft.preset.id,
    draft.ownership.workspaceId,
    draft.ownership.projectId ?? '_',
    draft.ownership.sessionId ?? '_',
    draft.ownership.firmwareIds?.join('|') ?? '_',
    draft.contextKinds.join('|'),
  ].join('::');
}
