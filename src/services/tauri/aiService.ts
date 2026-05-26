import { invoke } from '@tauri-apps/api/core';

import {
  DEFAULT_AI_ASSIST_MODEL_ID,
  DEFAULT_AI_ASSIST_PROVIDER_ID,
  type AiAssistDraft,
} from '../../shared/types/aiAssist';
import type {
  AiCommandError,
  AiProviderSummary,
  AiRequestContextEnvelope,
  CompressionPolicy,
  ContextSourceKind,
  ContextSourceRef,
  ListAiProvidersResponse,
  PrepareContextSnapshotRequest,
  PrepareContextSnapshotResponse,
  RawContextAttachment,
  SendAiChatRequest,
  SendAiChatResponse,
} from '../../shared/types/aiContext';

export const AI_ASSIST_PREVIEW_PROVIDER_ID = DEFAULT_AI_ASSIST_PROVIDER_ID;
export const AI_ASSIST_PREVIEW_MODEL_ID = DEFAULT_AI_ASSIST_MODEL_ID;
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

export const PREVIEW_AI_PROVIDER_CATALOG: ListAiProvidersResponse = {
  providers: [
    {
      providerId: DEFAULT_AI_ASSIST_PROVIDER_ID,
      displayName: 'Preview Provider',
      connectionStatus: 'connected',
      capabilityIds: ['text-chat', 'structured-output', 'local-only'],
      defaultModelId: DEFAULT_AI_ASSIST_MODEL_ID,
      models: [
        {
          modelId: DEFAULT_AI_ASSIST_MODEL_ID,
          displayName: 'Draft Preview',
        },
      ],
    },
    {
      providerId: 'ollama',
      displayName: 'Ollama',
      connectionStatus: 'disconnected',
      capabilityIds: ['text-chat', 'streaming', 'structured-output', 'long-context', 'local-only'],
      defaultModelId: 'llama3.1:8b',
      models: [
        {
          modelId: 'llama3.1:8b',
          displayName: 'Llama 3.1 8B',
        },
        {
          modelId: 'qwen2.5-coder:7b',
          displayName: 'Qwen 2.5 Coder 7B',
        },
      ],
    },
    {
      providerId: 'llama-server',
      displayName: 'Llama Server',
      connectionStatus: 'disconnected',
      capabilityIds: ['text-chat', 'streaming', 'local-only'],
      defaultModelId: 'local-instruct-8b',
      models: [
        {
          modelId: 'local-instruct-8b',
          displayName: 'Local Instruct 8B',
        },
      ],
    },
    {
      providerId: 'openai-compatible',
      displayName: 'OpenAI-Compatible',
      connectionStatus: 'disconnected',
      capabilityIds: ['text-chat', 'streaming', 'structured-output', 'long-context'],
      defaultModelId: 'gpt-4.1-mini',
      models: [
        {
          modelId: 'gpt-4.1-mini',
          displayName: 'GPT-4.1 Mini',
        },
        {
          modelId: 'gpt-4.1',
          displayName: 'GPT-4.1',
        },
      ],
    },
  ],
};

export interface BuildDraftPreviewRequestsInput {
  draft: AiAssistDraft;
  providerId?: string;
  modelId?: string;
}

export type TauriInvoke = <Response>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<Response>;

export interface AiService {
  listProviders(): Promise<ListAiProvidersResponse>;
  buildContextEnvelope(draft: AiAssistDraft): AiRequestContextEnvelope;
  buildPrepareContextSnapshotRequest(
    input: BuildPrepareContextSnapshotRequestInput,
  ): PrepareContextSnapshotRequest;
  buildSendAiChatRequest(input: BuildSendAiChatRequestInput): SendAiChatRequest;
  buildDraftPreviewRequests(input: BuildDraftPreviewRequestsInput): AiAssistRequestPreview;
  prepareContextSnapshot(
    request: PrepareContextSnapshotRequest,
  ): Promise<PrepareContextSnapshotResponse>;
  sendAiChat(request: SendAiChatRequest): Promise<SendAiChatResponse>;
}

export function createAiService(invokeCommand?: TauriInvoke): AiService {
  return {
    async listProviders(): Promise<ListAiProvidersResponse> {
      if (!invokeCommand) {
        return cloneProviderCatalog(PREVIEW_AI_PROVIDER_CATALOG);
      }

      try {
        return await invokeCommand<ListAiProvidersResponse>('list_ai_providers');
      } catch (error) {
        throw normalizeAiCommandError(error);
      }
    },

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
        mode: draft.mode,
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
      const normalizedPrompt = draft.prompt.trim();

      if (!normalizedProviderId) {
        throw new Error('providerId must be a non-empty string.');
      }

      if (!normalizedPrompt) {
        throw new Error('prompt must be a non-empty string.');
      }

      return {
        providerId: normalizedProviderId,
        modelId: normalizedModelId,
        mode: draft.mode,
        prompt: normalizedPrompt,
        ownership: draft.ownership,
        context: this.buildContextEnvelope(draft),
        contextSnapshotId,
      };
    },

    buildDraftPreviewRequests({
      draft,
      providerId,
      modelId,
    }: BuildDraftPreviewRequestsInput): AiAssistRequestPreview {
      const resolvedProviderId = providerId?.trim() || AI_ASSIST_PREVIEW_PROVIDER_ID;
      const resolvedModelId =
        modelId === undefined
          ? resolvedProviderId === AI_ASSIST_PREVIEW_PROVIDER_ID
            ? AI_ASSIST_PREVIEW_MODEL_ID
            : undefined
          : modelId.trim() || undefined;

      return {
        prepareContextSnapshotRequest: this.buildPrepareContextSnapshotRequest({
          draft,
          compression: AI_ASSIST_PREVIEW_COMPRESSION_POLICY,
        }),
        sendAiChatRequest: this.buildSendAiChatRequest({
          draft,
          providerId: resolvedProviderId,
          modelId: resolvedModelId,
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

    case 'map-selection':
      return [
        {
          sourceId: `map-selection::${draft.ownership.sessionId ?? draft.ownership.projectId ?? draft.ownership.workspaceId}`,
          kind,
          version: draft.firmwareSummary?.loadedAt,
          fingerprint: firmwareRef?.fingerprint,
        },
      ];

    case 'plugin-reference':
      return [
        {
          sourceId: `plugin-reference::${draft.ownership.projectId ?? draft.ownership.workspaceId}`,
          kind,
          version: draft.ownership.sessionId,
          fingerprint: draft.ownership.pluginReferenceIds?.join('|'),
        },
      ];

    case 'plugin-validation':
      return [
        {
          sourceId: `plugin-validation::${draft.surface}::${draft.ownership.sessionId ?? draft.ownership.projectId ?? draft.ownership.workspaceId}`,
          kind,
          version: draft.firmwareSummary?.loadedAt,
          fingerprint: firmwareRef?.fingerprint,
        },
      ];

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

function cloneProviderCatalog(catalog: ListAiProvidersResponse): ListAiProvidersResponse {
  return {
    providers: catalog.providers.map(cloneProviderSummary),
  };
}

function cloneProviderSummary(provider: AiProviderSummary): AiProviderSummary {
  return {
    ...provider,
    capabilityIds: [...provider.capabilityIds],
    models: provider.models.map((model) => ({ ...model })),
  };
}
