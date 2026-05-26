import { invoke } from '@tauri-apps/api/core';

import type { AiAssistDraft } from '../../shared/types/aiAssist';
import type {
  AiCommandError,
  AiRequestContextEnvelope,
  CompressionPolicy,
  ContextSourceKind,
  ContextSourceRef,
  PrepareContextSnapshotRequest,
  PrepareContextSnapshotResponse,
  RawContextAttachment,
  SendAiChatRequest,
  SendAiChatResponse,
} from '../../shared/types/aiContext';

export const AI_ASSIST_PREVIEW_PROVIDER_ID = 'preview-provider';
export const AI_ASSIST_PREVIEW_MODEL_ID = 'draft-preview';
export const AI_ASSIST_PREVIEW_COMPRESSION_POLICY: CompressionPolicy = {
  strategy: 'summary',
  targetTokenBudget: 1600,
  allowLossyCompression: false,
};

export interface BuildPrepareContextSnapshotRequestInput {
  draft: AiAssistDraft;
  compression?: CompressionPolicy;
}

export interface BuildSendAiChatRequestInput {
  draft: AiAssistDraft;
  providerId: string;
  modelId?: string;
  contextSnapshotId?: string;
}

export interface AiAssistRequestPreview {
  prepareContextSnapshotRequest: PrepareContextSnapshotRequest;
  sendAiChatRequest: SendAiChatRequest;
}

export type TauriInvoke = <Response>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<Response>;

export interface AiService {
  buildContextEnvelope(draft: AiAssistDraft): AiRequestContextEnvelope;
  buildPrepareContextSnapshotRequest(
    input: BuildPrepareContextSnapshotRequestInput,
  ): PrepareContextSnapshotRequest;
  buildSendAiChatRequest(input: BuildSendAiChatRequestInput): SendAiChatRequest;
  buildDraftPreviewRequests(draft: AiAssistDraft): AiAssistRequestPreview;
  prepareContextSnapshot(
    request: PrepareContextSnapshotRequest,
  ): Promise<PrepareContextSnapshotResponse>;
  sendAiChat(request: SendAiChatRequest): Promise<SendAiChatResponse>;
}

export function createAiService(invokeCommand?: TauriInvoke): AiService {
  return {
    buildContextEnvelope(draft: AiAssistDraft): AiRequestContextEnvelope {
      const firmwareRef = buildFirmwareSourceRef(draft);
      const retrievedContextRefs = dedupeSourceRefs(
        draft.contextKinds.flatMap((kind) => buildContextRefsForKind(kind, draft, firmwareRef)),
      );
      const rawAttachments =
        firmwareRef && draft.contextKinds.includes('firmware-summary')
          ? [buildFirmwareAttachment(firmwareRef)]
          : [];

      return {
        rawAttachments,
        retrievedContextRefs,
      };
    },

    buildPrepareContextSnapshotRequest({
      draft,
      compression,
    }: BuildPrepareContextSnapshotRequestInput): PrepareContextSnapshotRequest {
      return {
        ownership: draft.ownership,
        mode: draft.preset.mode,
        context: this.buildContextEnvelope(draft),
        compression,
      };
    },

    buildSendAiChatRequest({
      draft,
      providerId,
      modelId,
      contextSnapshotId,
    }: BuildSendAiChatRequestInput): SendAiChatRequest {
      const normalizedProviderId = providerId.trim();
      const normalizedModelId = modelId?.trim() || undefined;
      const normalizedPrompt = draft.preset.prompt.trim();

      if (!normalizedProviderId) {
        throw new Error('providerId must be a non-empty string.');
      }

      if (!normalizedPrompt) {
        throw new Error('prompt must be a non-empty string.');
      }

      return {
        providerId: normalizedProviderId,
        modelId: normalizedModelId,
        mode: draft.preset.mode,
        prompt: normalizedPrompt,
        ownership: draft.ownership,
        context: this.buildContextEnvelope(draft),
        contextSnapshotId,
      };
    },

    buildDraftPreviewRequests(draft: AiAssistDraft): AiAssistRequestPreview {
      return {
        prepareContextSnapshotRequest: this.buildPrepareContextSnapshotRequest({
          draft,
          compression: AI_ASSIST_PREVIEW_COMPRESSION_POLICY,
        }),
        sendAiChatRequest: this.buildSendAiChatRequest({
          draft,
          providerId: AI_ASSIST_PREVIEW_PROVIDER_ID,
          modelId: AI_ASSIST_PREVIEW_MODEL_ID,
        }),
      };
    },

    async prepareContextSnapshot(
      request: PrepareContextSnapshotRequest,
    ): Promise<PrepareContextSnapshotResponse> {
      if (request.ownership.workspaceId.trim().length === 0) {
        throw invalidWorkspaceOwnershipError();
      }

      if (!invokeCommand) {
        throw commandUnavailableError('prepare_context_snapshot');
      }

      try {
        return await invokeCommand<PrepareContextSnapshotResponse>('prepare_context_snapshot', {
          request,
        });
      } catch (error) {
        throw normalizeAiCommandError(error);
      }
    },

    async sendAiChat(request: SendAiChatRequest): Promise<SendAiChatResponse> {
      if (request.ownership.workspaceId.trim().length === 0) {
        throw invalidWorkspaceOwnershipError();
      }

      if (request.providerId.trim().length === 0) {
        throw invalidProviderIdError();
      }

      if (request.prompt.trim().length === 0) {
        throw invalidPromptError();
      }

      if (!invokeCommand) {
        throw commandUnavailableError('send_ai_chat');
      }

      try {
        return await invokeCommand<SendAiChatResponse>('send_ai_chat', {
          request,
        });
      } catch (error) {
        throw normalizeAiCommandError(error);
      }
    },
  };
}

export const aiService = createAiService(invoke);

function buildContextRefsForKind(
  kind: ContextSourceKind,
  draft: AiAssistDraft,
  firmwareRef: ContextSourceRef | null,
): ContextSourceRef[] {
  switch (kind) {
    case 'workspace-metadata':
      return [
        {
          sourceId: `workspace::${draft.ownership.workspaceId}`,
          kind,
        },
      ];

    case 'project-metadata':
      return draft.ownership.projectId
        ? [
            {
              sourceId: `project::${draft.ownership.projectId}`,
              kind,
            },
          ]
        : [];

    case 'session-metadata':
      return draft.ownership.sessionId
        ? [
            {
              sourceId: `session::${draft.ownership.sessionId}`,
              kind,
            },
          ]
        : [];

    case 'firmware-summary':
      return firmwareRef ? [firmwareRef] : [];

    default:
      return [];
  }
}

function buildFirmwareSourceRef(draft: AiAssistDraft): ContextSourceRef | null {
  if (!draft.firmwareSummary) {
    return null;
  }

  return {
    sourceId:
      draft.ownership.firmwareIds?.[0] ??
      `firmware::${draft.firmwareSummary.fileName}::${draft.firmwareSummary.checksum ?? draft.firmwareSummary.size}`,
    kind: 'firmware-summary',
    version: draft.firmwareSummary.loadedAt,
    fingerprint: draft.firmwareSummary.checksum ?? String(draft.firmwareSummary.size),
  };
}

function buildFirmwareAttachment(source: ContextSourceRef): RawContextAttachment {
  return {
    attachmentId: `raw::${source.sourceId}`,
    source,
    includedFields: ['fileName', 'size', 'checksum', 'loadedAt'],
  };
}

function dedupeSourceRefs(sourceRefs: ContextSourceRef[]): ContextSourceRef[] {
  const seen = new Set<string>();

  return sourceRefs.filter((sourceRef) => {
    const key = `${sourceRef.kind}::${sourceRef.sourceId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function invalidWorkspaceOwnershipError(): AiCommandError {
  return {
    code: 'invalid-ai-workspace',
    message: 'ownership.workspaceId must be a non-empty string.',
  };
}

function invalidProviderIdError(): AiCommandError {
  return {
    code: 'invalid-ai-provider',
    message: 'providerId must be a non-empty string.',
  };
}

function invalidPromptError(): AiCommandError {
  return {
    code: 'invalid-ai-prompt',
    message: 'prompt must be a non-empty string.',
  };
}

function commandUnavailableError(commandName: string): AiCommandError {
  return {
    code: 'ai-command-unavailable',
    message: `${commandName} requires a Tauri invoke bridge.`,
  };
}

function normalizeAiCommandError(error: unknown): AiCommandError {
  if (isAiCommandError(error)) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      code: 'ai-command-failed',
      message: error.message,
    };
  }

  return {
    code: 'ai-command-failed',
    message: 'AI command failed.',
  };
}

function isAiCommandError(error: unknown): error is AiCommandError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}
