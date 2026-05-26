import { useEffect, useMemo, useState } from 'react';

import { aiAssistStore } from '../../../services/storage/aiAssistStore';
import type {
  AiAssistDraft,
  AiAssistPreset,
  AiAssistPresetId,
} from '../../../shared/types/aiAssist';
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
  selectPreset: (presetId: AiAssistPresetId) => void;
}

export function useWorkspaceAiAssistState(
  ownership: PluginReferenceOwnership,
  lastLoadedFirmware: PersistedFirmwareSummary | null,
): WorkspaceAiAssistState {
  const [selectedPresetId, setSelectedPresetId] = useState<AiAssistPresetId | null>(
    () => aiAssistStore.loadState(ownership).selectedPresetId ?? null,
  );

  useEffect(() => {
    const nextState = aiAssistStore.loadState(ownership);
    setSelectedPresetId(nextState.selectedPresetId ?? null);
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

  return {
    presets: aiAssistPresets,
    selectedPresetId,
    selectedPreset,
    draft,
    selectPreset: (presetId: AiAssistPresetId) => {
      aiAssistStore.selectPreset({
        ownership,
        selectedPresetId: presetId,
      });
      setSelectedPresetId(presetId);
    },
  };
}

function buildFirmwareId(summary: PersistedFirmwareSummary): string {
  return ['firmware', summary.fileName, summary.checksum ?? String(summary.size)].join('::');
}
