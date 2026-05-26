import { useMemo } from 'react';

import {
  useWorkspaceAiAssist,
  useWorkspaceScope,
} from '../../../app/providers/WorkspaceScopeProvider';
import { aiService } from '../../../services/tauri';

export default function AiAssistPanel() {
  const { ownership } = useWorkspaceScope();
  const { presets, selectedPresetId, selectedPreset, draft, selectPreset } = useWorkspaceAiAssist();
  const requestPreview = useMemo(
    () => (draft ? aiService.buildDraftPreviewRequests(draft) : null),
    [draft],
  );

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
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <RequestPreviewCard
                  title="Context Snapshot Request"
                  detail={`${requestPreview.prepareContextSnapshotRequest.context.retrievedContextRefs.length} refs · ${requestPreview.prepareContextSnapshotRequest.context.rawAttachments.length} attachments`}
                  value={requestPreview.prepareContextSnapshotRequest}
                />
                <RequestPreviewCard
                  title="Chat Request"
                  detail={`${requestPreview.sendAiChatRequest.providerId} · ${requestPreview.sendAiChatRequest.mode}`}
                  value={requestPreview.sendAiChatRequest}
                />
              </div>
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
