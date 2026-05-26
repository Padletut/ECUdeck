import { useEffect, useMemo, useState } from 'react';

import {
  useWorkspaceAiAssist,
  useWorkspaceScope,
} from '../../../app/providers/WorkspaceScopeProvider';
import { aiService } from '../../../services/tauri/aiService';
import {
  DEFAULT_AI_ASSIST_MODEL_ID,
  DEFAULT_AI_ASSIST_PROVIDER_ID,
} from '../../../shared/types/aiAssist';
import type { AiCommandError } from '../../../shared/types/aiContext';

const providerOptions = [
  { value: DEFAULT_AI_ASSIST_PROVIDER_ID, label: 'Preview Provider' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'llama-server', label: 'Llama Server' },
  { value: 'openai-compatible', label: 'OpenAI-Compatible' },
];

export default function AiAssistPanel() {
  const { ownership } = useWorkspaceScope();
  const {
    presets,
    selectedPresetId,
    selectedPreset,
    draft,
    providerConfig,
    nativePreview,
    selectPreset,
    updateProviderConfig,
    recordNativePreview,
  } = useWorkspaceAiAssist();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const requestPreview = useMemo(
    () =>
      draft
        ? aiService.buildDraftPreviewRequests({
            draft,
            providerId: providerConfig.providerId,
            modelId: providerConfig.modelId,
          })
        : null,
    [draft, providerConfig.providerId, providerConfig.modelId],
  );
  const hasNativeBridge = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const previewResetKey = useMemo(() => {
    if (!draft) {
      return 'no-draft';
    }

    return [
      selectedPresetId ?? '_',
      draft.ownership.workspaceId,
      draft.ownership.projectId ?? '_',
      draft.ownership.sessionId ?? '_',
      draft.ownership.firmwareIds?.join('|') ?? '_',
      providerConfig.providerId,
      providerConfig.modelId ?? '_',
    ].join('::');
  }, [
    selectedPresetId,
    draft?.ownership.workspaceId,
    draft?.ownership.projectId,
    draft?.ownership.sessionId,
    draft?.ownership.firmwareIds,
    providerConfig.providerId,
    providerConfig.modelId,
  ]);

  useEffect(() => {
    setPreviewError(null);
    setPreviewLoading(false);
  }, [previewResetKey]);

  const handleRunNativePreview = async () => {
    if (!requestPreview) {
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const snapshotResponse = await aiService.prepareContextSnapshot(
        requestPreview.prepareContextSnapshotRequest,
      );
      const chatResponse = await aiService.sendAiChat({
        ...requestPreview.sendAiChatRequest,
        contextSnapshotId: snapshotResponse.snapshot.snapshotId,
      });

      recordNativePreview(snapshotResponse, chatResponse);
    } catch (error) {
      setPreviewError(getErrorMessage(error));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    const nextModelId =
      providerId === DEFAULT_AI_ASSIST_PROVIDER_ID
        ? (providerConfig.modelId ?? DEFAULT_AI_ASSIST_MODEL_ID)
        : providerConfig.modelId === DEFAULT_AI_ASSIST_MODEL_ID
          ? undefined
          : providerConfig.modelId;

    updateProviderConfig(providerId, nextModelId);
  };

  const handleModelChange = (modelId: string) => {
    updateProviderConfig(providerConfig.providerId, modelId);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
      <div className="flex items-center justify-between border-b border-gridlines-grey px-6 py-4">
        <div>
          <h2 className="text-section-title font-bold">AI Assist</h2>
          <p className="mt-1 text-sm text-alloy-silver">
            Workspace-scoped prompt drafts with explicit ownership and context previews.
          </p>
        </div>
        <span className="text-alloy-silver text-sm">Preview only</span>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          {presets.map((preset) => {
            const isSelected = preset.id === selectedPresetId;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset.id)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  isSelected
                    ? 'border-electric-blue bg-carbon-black text-soft-white'
                    : 'border-gridlines-grey text-soft-white hover:border-electric-blue hover:bg-carbon-black'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span>{preset.title}</span>
                  <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                    {preset.mode}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {selectedPreset && draft ? (
          <div className="rounded-lg border border-gridlines-grey bg-carbon-black/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-muted-text">
                  Prepared Draft
                </p>
                <h3 className="mt-2 text-xl font-bold text-soft-white">{selectedPreset.title}</h3>
              </div>
              <span className="rounded-full border border-electric-blue/50 bg-electric-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-electric-blue">
                {draft.preset.mode}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-alloy-silver">{draft.preset.prompt}</p>

            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <InfoField label="Workspace" value={ownership.workspaceId} />
              <InfoField label="Project" value={ownership.projectId ?? '-'} />
              <InfoField label="Session" value={ownership.sessionId ?? '-'} />
            </dl>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <label
                  htmlFor="ai-provider-id"
                  className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver"
                >
                  Provider Route
                </label>
                <select
                  id="ai-provider-id"
                  value={providerConfig.providerId}
                  onChange={(event) => handleProviderChange(event.target.value)}
                  className="w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm text-soft-white outline-none transition focus:border-electric-blue"
                >
                  {providerOptions.map((providerOption) => (
                    <option key={providerOption.value} value={providerOption.value}>
                      {providerOption.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-muted-text">
                  This provider id is written into the AI request and persisted per workspace scope.
                </p>
              </div>

              <div>
                <label
                  htmlFor="ai-model-id"
                  className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver"
                >
                  Model ID
                </label>
                <input
                  id="ai-model-id"
                  value={providerConfig.modelId ?? ''}
                  onChange={(event) => handleModelChange(event.target.value)}
                  placeholder={
                    providerConfig.providerId === DEFAULT_AI_ASSIST_PROVIDER_ID
                      ? DEFAULT_AI_ASSIST_MODEL_ID
                      : 'Optional provider-specific model'
                  }
                  className="w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 font-mono text-sm text-soft-white outline-none transition focus:border-electric-blue"
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="mt-2 text-sm text-muted-text">
                  Leave this empty for provider defaults. The preview provider keeps its draft model
                  by default.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-text">Context Sources</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.contextKinds.map((kind) => (
                  <span
                    key={kind}
                    className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver"
                  >
                    {kind}
                  </span>
                ))}
              </div>
            </div>

            {draft.firmwareSummary ? (
              <div className="mt-5 rounded-lg border border-gridlines-grey bg-steel-grey-alt/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-text">
                  Firmware Summary
                </p>
                <p className="mt-2 font-semibold text-soft-white">
                  {draft.firmwareSummary.fileName}
                </p>
                <p className="mt-1 text-sm text-alloy-silver">
                  {formatFileSize(draft.firmwareSummary.size)}
                  {draft.firmwareSummary.checksum ? ` · ${draft.firmwareSummary.checksum}` : ''}
                </p>
              </div>
            ) : null}

            {requestPreview ? (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void handleRunNativePreview();
                    }}
                    disabled={!hasNativeBridge || previewLoading}
                    className="rounded-lg border border-electric-blue px-4 py-2 text-sm font-semibold text-electric-blue transition hover:bg-electric-blue/10 disabled:cursor-not-allowed disabled:border-gridlines-grey disabled:text-muted-text"
                  >
                    {previewLoading ? 'Running native preview...' : 'Run native preview'}
                  </button>
                  <p className="text-sm text-alloy-silver">
                    {hasNativeBridge
                      ? 'Uses the Tauri command bridge and normalized preview responses.'
                      : 'Native preview is available when the dashboard runs inside the Tauri shell.'}
                  </p>
                </div>

                {previewError ? (
                  <div className="mt-4 rounded-lg border border-warning-amber/40 bg-warning-amber/10 px-4 py-3 text-sm text-warning-amber">
                    {previewError}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <RequestPreviewCard
                    title="Context Snapshot Request"
                    detail={`${requestPreview.prepareContextSnapshotRequest.context.retrievedContextRefs.length} refs · ${requestPreview.prepareContextSnapshotRequest.context.rawAttachments.length} attachments`}
                    value={requestPreview.prepareContextSnapshotRequest}
                  />
                  <RequestPreviewCard
                    title="Chat Request"
                    detail={`${requestPreview.sendAiChatRequest.providerId}${requestPreview.sendAiChatRequest.modelId ? ` / ${requestPreview.sendAiChatRequest.modelId}` : ''} · ${requestPreview.sendAiChatRequest.mode}`}
                    value={requestPreview.sendAiChatRequest}
                  />
                </div>

                {nativePreview ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <RequestPreviewCard
                      title="Context Snapshot Response"
                      detail={nativePreview.snapshotResponse.snapshot.summaryText}
                      value={nativePreview.snapshotResponse}
                    />
                    <RequestPreviewCard
                      title="Chat Response"
                      detail={nativePreview.chatResponse.summaryText}
                      value={nativePreview.chatResponse}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-gridlines-grey bg-carbon-black/40 p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-muted-text">
              Awaiting Selection
            </p>
            <p className="mt-3 text-sm leading-6 text-alloy-silver">
              Select an AI assist preset to prepare a workspace-scoped draft request preview.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-gridlines-grey bg-steel-grey-alt/30 px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.2em] text-muted-text">{label}</dt>
      <dd className="mt-2 font-mono text-sm text-soft-white">{value}</dd>
    </div>
  );
}

function RequestPreviewCard({
  title,
  detail,
  value,
}: Readonly<{
  title: string;
  detail: string;
  value: object;
}>) {
  return (
    <div className="rounded-lg border border-gridlines-grey bg-steel-grey-alt/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-text">{title}</p>
          <p className="mt-2 text-sm text-alloy-silver">{detail}</p>
        </div>
      </div>
      <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-gridlines-grey bg-carbon-black/60 p-4 text-xs leading-6 text-alloy-silver">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (sizeInBytes >= 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${sizeInBytes} B`;
}

function getErrorMessage(error: unknown): string {
  if (isAiCommandError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Native preview failed.';
}

function isAiCommandError(error: unknown): error is AiCommandError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}
