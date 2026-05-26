import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';

import {
  useWorkspaceFirmware,
  useWorkspaceScope,
} from '../../../app/providers/WorkspaceScopeProvider';
import { PREVIEW_AI_PROVIDER_CATALOG, aiService } from '../../../services/tauri/aiService';
import type { AiCommandError, AiProviderSummary } from '../../../shared/types/aiContext';
import {
  DEFAULT_AI_ASSIST_MODEL_ID,
  DEFAULT_AI_ASSIST_PROVIDER_ID,
  type AiAssistMode,
  type AiAssistReviewStatus,
  type AiAssistSurface,
  type PersistedAiAssistNativePreview,
} from '../../../shared/types/aiAssist';
import { useAiAssistState } from '../hooks/useWorkspaceAiAssistState';

interface AiAssistPanelProps {
  surface: AiAssistSurface;
  title: string;
  description: string;
  scopeBadge: string;
  composerPlaceholder: string;
}

export default function AiAssistPanel({
  surface,
  title,
  description,
  scopeBadge,
  composerPlaceholder,
}: Readonly<AiAssistPanelProps>) {
  const settingsPanelId = useId();
  const promptInputId = useId();
  const modeSelectId = useId();
  const { ownership } = useWorkspaceScope();
  const { lastLoadedFirmware } = useWorkspaceFirmware();
  const {
    mode,
    draftPrompt,
    draft,
    providerConfig,
    nativePreview,
    previewHistory,
    updateMode,
    updateDraftPrompt,
    updateProviderConfig,
    restorePreviewContext,
    updatePreviewReviewStatus,
    recordNativePreview,
  } = useAiAssistState(ownership, lastLoadedFirmware, surface);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedHistorySnapshotId, setSelectedHistorySnapshotId] = useState<string | null>(null);
  const [providerCatalogError, setProviderCatalogError] = useState<string | null>(null);
  const [providerCatalogLoading, setProviderCatalogLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<AiProviderSummary[]>(
    PREVIEW_AI_PROVIDER_CATALOG.providers,
  );
  const previewCatalogFallback = PREVIEW_AI_PROVIDER_CATALOG.providers[0] ?? null;
  const hasNativeBridge = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const requestPreview = useMemo(
    () =>
      draft
        ? aiService.buildDraftPreviewRequests({
            draft,
            providerId: providerConfig.providerId,
            modelId: providerConfig.modelId,
          })
        : null,
    [draft, providerConfig.modelId, providerConfig.providerId],
  );
  const selectedProvider = useMemo(
    () =>
      availableProviders.find((provider) => provider.providerId === providerConfig.providerId) ??
      previewCatalogFallback,
    [availableProviders, previewCatalogFallback, providerConfig.providerId],
  );
  const recentPreviewHistory = useMemo(() => previewHistory.slice(0, 5), [previewHistory]);
  const previewHistoryBySnapshotId = useMemo(
    () =>
      new Map(previewHistory.map((entry) => [entry.snapshotResponse.snapshot.snapshotId, entry])),
    [previewHistory],
  );
  const selectedHistoryPreview = useMemo(
    () =>
      selectedHistorySnapshotId
        ? (previewHistoryBySnapshotId.get(selectedHistorySnapshotId) ?? null)
        : null,
    [previewHistoryBySnapshotId, selectedHistorySnapshotId],
  );
  const activePreviewEntry = selectedHistoryPreview ?? nativePreview;
  const activeSurfaceLabel = formatSurfaceLabel(surface);

  useEffect(() => {
    setPreviewError(null);
    setPreviewLoading(false);
  }, [draft?.prompt, draft?.mode, providerConfig.providerId, providerConfig.modelId]);

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

  const handlePromptChange = (value: string) => {
    setSelectedHistorySnapshotId(null);
    updateDraftPrompt(value);
  };

  const handleModeChange = (nextMode: AiAssistMode) => {
    setSelectedHistorySnapshotId(null);
    updateMode(nextMode);
  };

  const handleProviderChange = (providerId: string) => {
    const nextProvider = availableProviders.find((provider) => provider.providerId === providerId);
    const nextModelId = nextProvider?.defaultModelId;

    setSelectedHistorySnapshotId(null);
    updateProviderConfig(providerId, nextModelId);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedHistorySnapshotId(null);
    updateProviderConfig(providerConfig.providerId, modelId);
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    if (!draft || !hasNativeBridge || previewLoading) {
      return;
    }

    void handleRunNativePreview();
  };

  const handleReviewStatusChange = (reviewStatus: AiAssistReviewStatus) => {
    if (!activePreviewEntry) {
      return;
    }

    updatePreviewReviewStatus(
      activePreviewEntry.snapshotResponse.snapshot.snapshotId,
      reviewStatus,
    );
  };

  const handleUseHistoryEntry = (previewEntry: PersistedAiAssistNativePreview) => {
    restorePreviewContext(previewEntry);
    setSelectedHistorySnapshotId(previewEntry.snapshotResponse.snapshot.snapshotId);
    setPreviewError(null);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
      <div className="border-b border-gridlines-grey px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-section-title font-bold">{title}</h2>
              <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                {scopeBadge}
              </span>
            </div>
            <p className="mt-1 text-sm text-alloy-silver">{description}</p>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen((currentValue) => !currentValue)}
            aria-expanded={isSettingsOpen}
            aria-controls={settingsPanelId}
            aria-label={isSettingsOpen ? 'Close copilot settings' : 'Open copilot settings'}
            className="rounded-lg border border-gridlines-grey bg-carbon-black/50 p-2 text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {isSettingsOpen ? (
        <div
          id={settingsPanelId}
          className="border-b border-gridlines-grey bg-carbon-black/30 px-5 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-text">
                Copilot Settings
              </p>
              <p className="mt-2 text-sm text-alloy-silver">
                Provider and model routing are persisted per editor surface.
              </p>
            </div>
            {selectedProvider ? (
              <span className={providerStatusClassName(selectedProvider.connectionStatus)}>
                {selectedProvider.connectionStatus}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label
                htmlFor={`${settingsPanelId}-provider`}
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver"
              >
                Provider Route
              </label>
              <select
                id={`${settingsPanelId}-provider`}
                value={providerConfig.providerId}
                onChange={(event) => handleProviderChange(event.target.value)}
                className="ecu-select w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm text-soft-white outline-none transition focus:border-electric-blue"
              >
                {availableProviders.map((providerOption) => (
                  <option key={providerOption.providerId} value={providerOption.providerId}>
                    {providerOption.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${settingsPanelId}-model`}
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver"
              >
                Model ID
              </label>
              <input
                id={`${settingsPanelId}-model`}
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
            </div>
          </div>

          {selectedProvider ? (
            <div className="mt-4 rounded-lg border border-gridlines-grey bg-steel-grey-alt/30 p-4">
              <p className="font-semibold text-soft-white">{selectedProvider.displayName}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedProvider.capabilityIds.map((capabilityId) => (
                  <span
                    key={capabilityId}
                    className="rounded-full border border-gridlines-grey px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-alloy-silver"
                  >
                    {capabilityId}
                  </span>
                ))}
              </div>
              {selectedProvider.models.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedProvider.models.map((modelOption) => {
                    const isActive = modelOption.modelId === providerConfig.modelId;

                    return (
                      <button
                        key={modelOption.modelId}
                        type="button"
                        onClick={() => handleModelChange(modelOption.modelId)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          isActive
                            ? 'border-electric-blue bg-electric-blue/10 text-electric-blue'
                            : 'border-gridlines-grey text-alloy-silver hover:border-electric-blue hover:text-electric-blue'
                        }`}
                      >
                        {modelOption.displayName}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {providerCatalogError ? (
            <p className="mt-4 text-sm text-warning-amber">{providerCatalogError}</p>
          ) : (
            <p className="mt-4 text-xs text-muted-text">
              {providerCatalogLoading
                ? 'Refreshing provider catalog from the Tauri command bridge.'
                : 'Routing changes apply to the next copilot request from this surface.'}
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-gridlines-grey bg-carbon-black/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver">
              {selectedProvider?.displayName ?? providerConfig.providerId}
            </span>
            <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver">
              {providerConfig.modelId ?? 'provider default'}
            </span>
            {draft?.firmwareSummary ? (
              <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold text-alloy-silver">
                {draft.firmwareSummary.fileName} · {formatFileSize(draft.firmwareSummary.size)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-text">
            Copilot uses compressed {activeSurfaceLabel.toLowerCase()} context, workspace metadata,
            and recent review state before sending a request.
          </p>
        </div>

        <div className="rounded-xl border border-gridlines-grey bg-carbon-black/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-text">Conversation</p>
              <h3 className="mt-1 text-lg font-bold text-soft-white">
                {selectedHistoryPreview
                  ? 'Reviewing a previous copilot run'
                  : activePreviewEntry
                    ? 'Latest copilot response'
                    : `Ready for ${activeSurfaceLabel.toLowerCase()} help`}
              </h3>
            </div>

            {selectedHistoryPreview ? (
              <button
                type="button"
                onClick={() => setSelectedHistorySnapshotId(null)}
                className="rounded-lg border border-gridlines-grey px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
              >
                Back To Latest
              </button>
            ) : activePreviewEntry ? (
              <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                {formatRecordedAt(activePreviewEntry.recordedAt)}
              </span>
            ) : null}
          </div>

          {activePreviewEntry ? (
            <div className="mt-4 space-y-4">
              <div className="ml-auto max-w-[92%] rounded-2xl border border-electric-blue/40 bg-electric-blue/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-electric-blue/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-electric-blue">
                    {formatModeLabel(activePreviewEntry.mode)}
                  </span>
                  <span className="text-xs text-alloy-silver">
                    {formatRecordedAt(activePreviewEntry.recordedAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-soft-white">
                  {activePreviewEntry.prompt}
                </p>
              </div>

              <div className="max-w-[94%] rounded-2xl border border-gridlines-grey bg-steel-grey-alt/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-text">
                      {formatResponseKindLabel(activePreviewEntry.chatResponse.responseKind)}
                    </p>
                    <p className="mt-1 text-sm text-alloy-silver">
                      {resolveProviderDisplayName(
                        activePreviewEntry.providerConfig.providerId,
                        availableProviders,
                      )}
                      {activePreviewEntry.providerConfig.modelId
                        ? ` · ${activePreviewEntry.providerConfig.modelId}`
                        : ''}
                    </p>
                  </div>
                  <span className={reviewStatusClassName(activePreviewEntry.reviewDecision.status)}>
                    {formatReviewStatus(activePreviewEntry.reviewDecision.status)}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-soft-white">
                  {activePreviewEntry.chatResponse.summaryText}
                </p>

                <div className="mt-4 rounded-xl border border-gridlines-grey bg-carbon-black/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-gridlines-grey px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                      Context Compress
                    </span>
                    <span className="rounded-full border border-gridlines-grey px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                      {activePreviewEntry.snapshotResponse.snapshot.metadata.strategy}
                    </span>
                    <span className="rounded-full border border-gridlines-grey px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                      {activePreviewEntry.snapshotResponse.snapshot.sourceRefs.length} refs
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-alloy-silver">
                    {activePreviewEntry.snapshotResponse.snapshot.summaryText}
                  </p>
                  {activePreviewEntry.snapshotResponse.snapshot.metadata.estimatedSnapshotTokens ? (
                    <p className="mt-2 text-xs text-muted-text">
                      Estimated snapshot tokens:{' '}
                      {
                        activePreviewEntry.snapshotResponse.snapshot.metadata
                          .estimatedSnapshotTokens
                      }
                    </p>
                  ) : null}
                  {activePreviewEntry.snapshotResponse.snapshot.unresolvedAssumptions.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-text">
                        Unresolved Assumptions
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-alloy-silver">
                        {activePreviewEntry.snapshotResponse.snapshot.unresolvedAssumptions.map(
                          (assumption) => (
                            <li key={assumption}>{assumption}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  ) : null}
                  {activePreviewEntry.snapshotResponse.snapshot.safetyWarnings.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-text">
                        Safety Warnings
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-warning-amber">
                        {activePreviewEntry.snapshotResponse.snapshot.safetyWarnings.map(
                          (warning) => (
                            <li key={warning}>{warning}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 rounded-xl border border-gridlines-grey bg-carbon-black/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-text">Review</p>
                      <p className="mt-2 text-sm text-alloy-silver">
                        {activePreviewEntry.chatResponse.proposal
                          ? 'This response is proposal-backed and stays review-gated until you decide.'
                          : 'Track whether this response should be kept, revisited, or discarded.'}
                      </p>
                    </div>
                    {activePreviewEntry.chatResponse.proposal ? (
                      <span className="rounded-full border border-gridlines-grey px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                        {activePreviewEntry.chatResponse.proposal.proposalId}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleReviewStatusChange('accepted')}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                        activePreviewEntry.reviewDecision.status === 'accepted'
                          ? 'border-dyno-green bg-dyno-green/10 text-dyno-green'
                          : 'border-gridlines-grey text-alloy-silver hover:border-dyno-green hover:text-dyno-green'
                      }`}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewStatusChange('rejected')}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                        activePreviewEntry.reviewDecision.status === 'rejected'
                          ? 'border-warning-amber bg-warning-amber/10 text-warning-amber'
                          : 'border-gridlines-grey text-alloy-silver hover:border-warning-amber hover:text-warning-amber'
                      }`}
                    >
                      Reject
                    </button>
                    {activePreviewEntry.reviewDecision.status !== 'pending' ? (
                      <button
                        type="button"
                        onClick={() => handleReviewStatusChange('pending')}
                        className="rounded-lg border border-gridlines-grey px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
                      >
                        Reset
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleUseHistoryEntry(activePreviewEntry)}
                      className="rounded-lg border border-gridlines-grey px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
                    >
                      Use Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-gridlines-grey bg-carbon-black/35 px-4 py-6">
              <p className="text-sm leading-6 text-alloy-silver">
                Write a message below and the copilot will assemble compressed{' '}
                {activeSurfaceLabel.toLowerCase()} context before sending it through the active
                provider route.
              </p>
            </div>
          )}
        </div>

        {recentPreviewHistory.length > 0 ? (
          <div className="rounded-xl border border-gridlines-grey bg-carbon-black/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-text">Recent Runs</p>
                <p className="mt-1 text-sm text-alloy-silver">
                  Reopen a previous response or reuse its prompt and provider setup.
                </p>
              </div>
              <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                {recentPreviewHistory.length}
              </span>
            </div>

            <ul className="mt-4 space-y-3">
              {recentPreviewHistory.map((previewEntry) => {
                const snapshotId = previewEntry.snapshotResponse.snapshot.snapshotId;
                const isActive = selectedHistorySnapshotId === snapshotId;

                return (
                  <li
                    key={snapshotId}
                    className={`rounded-xl border p-4 ${
                      isActive
                        ? 'border-electric-blue bg-electric-blue/5'
                        : 'border-gridlines-grey bg-carbon-black/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-soft-white">
                          {formatModeLabel(previewEntry.mode)}
                        </p>
                        <p className="mt-1 text-xs text-alloy-silver">
                          {formatRecordedAt(previewEntry.recordedAt)}
                        </p>
                        <p className="mt-2 text-sm text-alloy-silver">
                          {truncateText(previewEntry.prompt, 92)}
                        </p>
                        <p className="mt-2 text-sm text-muted-text">
                          {truncateText(previewEntry.chatResponse.summaryText, 120)}
                        </p>
                      </div>
                      <span className={reviewStatusClassName(previewEntry.reviewDecision.status)}>
                        {formatReviewStatus(previewEntry.reviewDecision.status)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedHistorySnapshotId(isActive ? null : snapshotId)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                          isActive
                            ? 'border-electric-blue bg-electric-blue/10 text-electric-blue'
                            : 'border-gridlines-grey text-alloy-silver hover:border-electric-blue hover:text-electric-blue'
                        }`}
                      >
                        {isActive ? 'Hide' : 'Open'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUseHistoryEntry(previewEntry)}
                        className="rounded-lg border border-gridlines-grey px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
                      >
                        Use Again
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="rounded-xl border border-gridlines-grey bg-carbon-black/60 p-4">
          <label
            htmlFor={promptInputId}
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver"
          >
            Message
          </label>
          <textarea
            id={promptInputId}
            value={draftPrompt}
            onChange={(event) => handlePromptChange(event.target.value)}
            onKeyDown={handlePromptKeyDown}
            placeholder={composerPlaceholder}
            rows={5}
            className="w-full rounded-xl border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm leading-6 text-soft-white outline-none transition focus:border-electric-blue"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {(draft?.contextKinds ?? []).map((kind) => (
              <span
                key={kind}
                className="rounded-full border border-gridlines-grey px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-alloy-silver"
              >
                {kind}
              </span>
            ))}
          </div>

          <div className="mt-4 grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-text">
                {hasNativeBridge
                  ? 'Press Ctrl/Cmd+Enter to send. Draft, mode, and routing stay attached to this editor surface.'
                  : 'Send is available when this surface runs inside the Tauri shell.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  void handleRunNativePreview();
                }}
                disabled={!draft || !hasNativeBridge || previewLoading}
                className="rounded-lg border border-electric-blue px-4 py-2 text-sm font-semibold text-electric-blue transition hover:bg-electric-blue/10 disabled:cursor-not-allowed disabled:border-gridlines-grey disabled:text-muted-text"
              >
                {previewLoading ? 'Sending...' : 'Send'}
              </button>
            </div>

            <div>
              <label
                htmlFor={modeSelectId}
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver"
              >
                Mode
              </label>
              <select
                id={modeSelectId}
                value={mode}
                onChange={(event) => handleModeChange(event.target.value as AiAssistMode)}
                className="ecu-select w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm text-soft-white outline-none transition focus:border-electric-blue"
              >
                <option value="ask">Ask</option>
                <option value="plan">Plan</option>
                <option value="agent">Agent</option>
              </select>
              <p className="mt-2 text-sm text-muted-text">{describeMode(mode, surface)}</p>
            </div>
          </div>

          {previewError ? (
            <div className="mt-4 rounded-lg border border-warning-amber/40 bg-warning-amber/10 px-4 py-3 text-sm text-warning-amber">
              {previewError}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.06 2.75c.04-.23.24-.4.48-.4h2.92c.24 0 .44.17.48.4l.36 2.56c.57.23 1.1.54 1.59.91l2.41-.96c.22-.09.47 0 .58.2l1.46 2.53c.12.21.07.47-.11.61l-2.05 1.59c.04.27.06.54.06.81 0 .27-.02.54-.06.81l2.05 1.59c.18.14.23.4.11.61l-1.46 2.53c-.11.2-.36.29-.58.2l-2.41-.96c-.49.37-1.02.68-1.59.91l-.36 2.56c-.04.23-.24.4-.48.4h-2.92c-.24 0-.44-.17-.48-.4l-.36-2.56a7.79 7.79 0 01-1.59-.91l-2.41.96c-.22.09-.47 0-.58-.2l-1.46-2.53a.5.5 0 01.11-.61l2.05-1.59A6.53 6.53 0 015.3 12c0-.27.02-.54.06-.81L3.31 9.6a.5.5 0 01-.11-.61l1.46-2.53c.11-.2.36-.29.58-.2l2.41.96c.49-.37 1.02-.68 1.59-.91l.36-2.56ZM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z"
      />
    </svg>
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

  return 'Copilot request failed.';
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

function reviewStatusClassName(status: AiAssistReviewStatus): string {
  switch (status) {
    case 'accepted':
      return 'rounded-full border border-dyno-green/50 bg-dyno-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-dyno-green';
    case 'rejected':
      return 'rounded-full border border-warning-amber/50 bg-warning-amber/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-warning-amber';
    case 'pending':
    default:
      return 'rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver';
  }
}

function formatReviewStatus(status: AiAssistReviewStatus): string {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Rejected';
    case 'pending':
    default:
      return 'Pending';
  }
}

function formatModeLabel(mode: AiAssistMode): string {
  switch (mode) {
    case 'plan':
      return 'Plan';
    case 'agent':
      return 'Agent';
    case 'ask':
    default:
      return 'Ask';
  }
}

function describeMode(mode: AiAssistMode, surface: AiAssistSurface): string {
  switch (mode) {
    case 'plan':
      return `Use Plan to break the current ${formatSurfaceLabel(surface).toLowerCase()} task into safe, explicit steps before changing anything.`;
    case 'agent':
      return `Use Agent when you want the copilot to prepare stronger proposals tied to the active ${formatSurfaceLabel(surface).toLowerCase()} context.`;
    case 'ask':
    default:
      return `Use Ask when you want explanations, interpretation help, or grounded feedback about the active ${formatSurfaceLabel(surface).toLowerCase()} context.`;
  }
}

function formatResponseKindLabel(
  responseKind: PersistedAiAssistNativePreview['chatResponse']['responseKind'],
): string {
  switch (responseKind) {
    case 'proposal':
      return 'Proposal';
    case 'plan':
      return 'Plan';
    case 'explanation':
    default:
      return 'Answer';
  }
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function formatRecordedAt(recordedAt: string): string {
  const parsedDate = new Date(recordedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return recordedAt;
  }

  return parsedDate.toLocaleString();
}

function formatSurfaceLabel(surface: AiAssistSurface): string {
  switch (surface) {
    case 'plugin-editor':
      return 'Plugin Editor';
    case 'map-editor':
    default:
      return 'Map Editor';
  }
}
