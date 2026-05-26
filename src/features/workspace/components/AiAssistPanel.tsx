import { useEffect, useMemo, useState } from 'react';

import {
  useWorkspaceAiAssist,
  useWorkspaceScope,
} from '../../../app/providers/WorkspaceScopeProvider';
import { PREVIEW_AI_PROVIDER_CATALOG, aiService } from '../../../services/tauri/aiService';
import type { AiProviderSummary } from '../../../shared/types/aiContext';
import {
  DEFAULT_AI_ASSIST_MODEL_ID,
  DEFAULT_AI_ASSIST_PROVIDER_ID,
} from '../../../shared/types/aiAssist';
import type { AiCommandError } from '../../../shared/types/aiContext';

export default function AiAssistPanel() {
  const { ownership } = useWorkspaceScope();
  const {
    presets,
    selectedPresetId,
    selectedPreset,
    draft,
    providerConfig,
    nativePreview,
    previewHistory,
    selectPreset,
    updateProviderConfig,
    restorePreviewContext,
    recordNativePreview,
  } = useWorkspaceAiAssist();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedHistorySnapshotId, setSelectedHistorySnapshotId] = useState<string | null>(null);
  const [providerCatalogError, setProviderCatalogError] = useState<string | null>(null);
  const [providerCatalogLoading, setProviderCatalogLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<AiProviderSummary[]>(
    PREVIEW_AI_PROVIDER_CATALOG.providers,
  );
  const previewCatalogFallback = PREVIEW_AI_PROVIDER_CATALOG.providers[0] ?? null;
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
  const selectedProvider = useMemo(
    () =>
      availableProviders.find((provider) => provider.providerId === providerConfig.providerId) ??
      previewCatalogFallback,
    [availableProviders, previewCatalogFallback, providerConfig.providerId],
  );
  const recentPreviewHistory = useMemo(() => previewHistory.slice(0, 5), [previewHistory]);
  const selectedHistoryPreview = useMemo(
    () =>
      selectedHistorySnapshotId
        ? (previewHistory.find(
            (entry) => entry.snapshotResponse.snapshot.snapshotId === selectedHistorySnapshotId,
          ) ?? null)
        : null,
    [previewHistory, selectedHistorySnapshotId],
  );
  const activePreviewEntry = selectedHistoryPreview ?? nativePreview;
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

  useEffect(() => {
    if (!selectedHistorySnapshotId) {
      return;
    }

    const hasMatchingHistoryEntry = previewHistory.some(
      (entry) => entry.snapshotResponse.snapshot.snapshotId === selectedHistorySnapshotId,
    );

    if (!hasMatchingHistoryEntry) {
      setSelectedHistorySnapshotId(null);
    }
  }, [previewHistory, selectedHistorySnapshotId]);

  useEffect(() => {
    if (!hasNativeBridge) {
      setAvailableProviders(PREVIEW_AI_PROVIDER_CATALOG.providers);
      setProviderCatalogError(null);
      setProviderCatalogLoading(false);
      return;
    }

    let cancelled = false;
    setProviderCatalogLoading(true);

    void aiService
      .listProviders()
      .then((response) => {
        if (cancelled) {
          return;
        }

        setAvailableProviders(
          response.providers.length > 0
            ? response.providers
            : PREVIEW_AI_PROVIDER_CATALOG.providers,
        );
        setProviderCatalogError(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setAvailableProviders(PREVIEW_AI_PROVIDER_CATALOG.providers);
        setProviderCatalogError(getErrorMessage(error));
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setProviderCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasNativeBridge]);

  useEffect(() => {
    if (!previewCatalogFallback) {
      return;
    }

    const matchedProvider = availableProviders.find(
      (provider) => provider.providerId === providerConfig.providerId,
    );

    if (matchedProvider) {
      return;
    }

    updateProviderConfig(
      previewCatalogFallback.providerId,
      previewCatalogFallback.defaultModelId ?? DEFAULT_AI_ASSIST_MODEL_ID,
    );
  }, [availableProviders, previewCatalogFallback, providerConfig.providerId, updateProviderConfig]);

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
      setSelectedHistorySnapshotId(null);
    } catch (error) {
      setPreviewError(getErrorMessage(error));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    const nextProvider = availableProviders.find((provider) => provider.providerId === providerId);
    const nextModelId = nextProvider?.defaultModelId;

    updateProviderConfig(providerId, nextModelId);
  };

  const handleModelChange = (modelId: string) => {
    updateProviderConfig(providerConfig.providerId, modelId);
  };

  const handleSelectHistoryPreview = (snapshotId: string) => {
    setSelectedHistorySnapshotId((currentSelection) =>
      currentSelection === snapshotId ? null : snapshotId,
    );
  };

  const handleRestoreHistoryContext = (previewEntry: (typeof recentPreviewHistory)[number]) => {
    restorePreviewContext(previewEntry);
    setSelectedHistorySnapshotId(previewEntry.snapshotResponse.snapshot.snapshotId);
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
                  {availableProviders.map((providerOption) => (
                    <option key={providerOption.providerId} value={providerOption.providerId}>
                      {providerOption.displayName}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-muted-text">
                  {providerCatalogLoading
                    ? 'Refreshing provider catalog from the AI command bridge.'
                    : 'This provider id is written into the AI request and persisted per workspace scope.'}
                </p>
                {providerCatalogError ? (
                  <p className="mt-2 text-sm text-warning-amber">{providerCatalogError}</p>
                ) : null}
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
                    selectedProvider?.defaultModelId ??
                    (providerConfig.providerId === DEFAULT_AI_ASSIST_PROVIDER_ID
                      ? DEFAULT_AI_ASSIST_MODEL_ID
                      : 'Optional provider-specific model')
                  }
                  className="w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 font-mono text-sm text-soft-white outline-none transition focus:border-electric-blue"
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="mt-2 text-sm text-muted-text">
                  Leave this empty for provider defaults. The command bridge now supplies provider
                  status, capabilities, and model suggestions.
                </p>
                {selectedProvider?.models.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedProvider.models.map((model) => {
                      const isActive = model.modelId === providerConfig.modelId;

                      return (
                        <button
                          key={model.modelId}
                          type="button"
                          onClick={() => handleModelChange(model.modelId)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            isActive
                              ? 'border-electric-blue bg-electric-blue/10 text-electric-blue'
                              : 'border-gridlines-grey text-alloy-silver hover:border-electric-blue hover:text-electric-blue'
                          }`}
                        >
                          {model.displayName}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {selectedProvider ? (
              <div className="mt-5 rounded-lg border border-gridlines-grey bg-steel-grey-alt/30 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={providerStatusClassName(selectedProvider.connectionStatus)}>
                    {selectedProvider.connectionStatus}
                  </span>
                  <p className="text-sm text-alloy-silver">{selectedProvider.displayName}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedProvider.capabilityIds.map((capabilityId) => (
                    <span
                      key={capabilityId}
                      className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver"
                    >
                      {capabilityId}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

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

                {activePreviewEntry ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {selectedHistoryPreview ? (
                      <div className="xl:col-span-2 rounded-lg border border-warning-amber/40 bg-warning-amber/10 px-4 py-3 text-sm text-warning-amber">
                        Showing a historical preview entry from{' '}
                        {formatRecordedAt(selectedHistoryPreview.recordedAt)}. Run a new preview to
                        return to the current draft response cards.
                      </div>
                    ) : null}
                    <RequestPreviewCard
                      title="Context Snapshot Response"
                      detail={activePreviewEntry.snapshotResponse.snapshot.summaryText}
                      value={activePreviewEntry.snapshotResponse}
                    />
                    <RequestPreviewCard
                      title="Chat Response"
                      detail={activePreviewEntry.chatResponse.summaryText}
                      value={activePreviewEntry.chatResponse}
                    />
                  </div>
                ) : null}

                {recentPreviewHistory.length > 0 ? (
                  <div className="mt-5 rounded-lg border border-gridlines-grey bg-steel-grey-alt/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-text">
                          Recent Preview Activity
                        </p>
                        <p className="mt-2 text-sm text-alloy-silver">
                          Latest scope-scoped snapshot/chat previews retained for auditability.
                        </p>
                      </div>
                      <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                        {recentPreviewHistory.length} items
                      </span>
                    </div>

                    <ul className="mt-4 space-y-3">
                      {recentPreviewHistory.map((previewEntry) => (
                        <li
                          key={previewEntry.snapshotResponse.snapshot.snapshotId}
                          className={`rounded-lg border bg-carbon-black/50 p-4 ${
                            selectedHistorySnapshotId ===
                            previewEntry.snapshotResponse.snapshot.snapshotId
                              ? 'border-electric-blue'
                              : 'border-gridlines-grey'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-soft-white">
                                {resolveProviderDisplayName(
                                  previewEntry.providerConfig.providerId,
                                  availableProviders,
                                )}
                              </p>
                              <p className="mt-1 text-sm text-alloy-silver">
                                {resolvePresetTitle(previewEntry.presetId, presets)}
                              </p>
                              <p className="mt-1 text-sm text-alloy-silver">
                                {formatRecordedAt(previewEntry.recordedAt)}
                              </p>
                            </div>
                            <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                              {previewEntry.providerConfig.modelId ?? 'provider-default'}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectHistoryPreview(
                                  previewEntry.snapshotResponse.snapshot.snapshotId,
                                )
                              }
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                                selectedHistorySnapshotId ===
                                previewEntry.snapshotResponse.snapshot.snapshotId
                                  ? 'border-electric-blue bg-electric-blue/10 text-electric-blue'
                                  : 'border-gridlines-grey text-alloy-silver hover:border-electric-blue hover:text-electric-blue'
                              }`}
                            >
                              {selectedHistorySnapshotId ===
                              previewEntry.snapshotResponse.snapshot.snapshotId
                                ? 'Hide Details'
                                : 'Inspect'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestoreHistoryContext(previewEntry)}
                              className="rounded-lg border border-gridlines-grey px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
                            >
                              Restore Context
                            </button>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-alloy-silver">
                            {previewEntry.chatResponse.summaryText}
                          </p>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <HistoryField
                              label="Snapshot"
                              value={previewEntry.snapshotResponse.snapshot.snapshotId}
                            />
                            <HistoryField
                              label="Proposal"
                              value={
                                previewEntry.chatResponse.proposal?.proposalId ?? 'No proposal'
                              }
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
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

function HistoryField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-gridlines-grey bg-steel-grey-alt/20 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-text">{label}</p>
      <p className="mt-2 break-all font-mono text-xs text-alloy-silver">{value}</p>
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

function providerStatusClassName(status: AiProviderSummary['connectionStatus']): string {
  switch (status) {
    case 'connected':
      return 'rounded-full border border-dyno-green/50 bg-dyno-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-dyno-green';
    case 'degraded':
      return 'rounded-full border border-warning-amber/50 bg-warning-amber/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-warning-amber';
    case 'disconnected':
    default:
      return 'rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver';
  }
}

function resolveProviderDisplayName(providerId: string, providers: AiProviderSummary[]): string {
  return (
    providers.find((provider) => provider.providerId === providerId)?.displayName ?? providerId
  );
}

function resolvePresetTitle(
  presetId: string,
  presets: ReadonlyArray<{ id: string; title: string }>,
): string {
  return presets.find((preset) => preset.id === presetId)?.title ?? presetId;
}

function formatRecordedAt(recordedAt: string): string {
  const parsedDate = new Date(recordedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return recordedAt;
  }

  return parsedDate.toLocaleString();
}
