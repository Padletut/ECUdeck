import { describe, expect, it, jest } from '@jest/globals';

import type { AiAssistDraft } from '../../shared/types/aiAssist';
import type {
  ListAiProvidersResponse,
  PrepareContextSnapshotResponse,
  SendAiChatResponse,
} from '../../shared/types/aiContext';
import {
  AI_ASSIST_PREVIEW_COMPRESSION_POLICY,
  AI_ASSIST_PREVIEW_MODEL_ID,
  AI_ASSIST_PREVIEW_PROVIDER_ID,
  PREVIEW_AI_PROVIDER_CATALOG,
  createAiService,
  type TauriInvoke,
} from './aiService';

describe('createAiService', () => {
  const draft: AiAssistDraft = {
    surface: 'map-editor',
    mode: 'plan',
    prompt:
      'Generate a first-pass review plan for this firmware scope, including the safest deterministic checks to run before deeper analysis.',
    ownership: {
      workspaceId: 'local-workspace',
      projectId: 'dashboard-plugin-validation',
      sessionId: 'dashboard-session',
      firmwareIds: ['firmware::sample.bin::ABC123'],
    },
    contextKinds: [
      'workspace-metadata',
      'project-metadata',
      'session-metadata',
      'firmware-summary',
    ],
    firmwareSummary: {
      fileName: 'sample.bin',
      size: 4096,
      checksum: 'ABC123',
      loadedAt: '2026-05-26T08:30:00.000Z',
    },
  };

  it('builds a context snapshot request from the AI assist draft', () => {
    const service = createAiService();

    expect(
      service.buildPrepareContextSnapshotRequest({
        draft,
        compression: AI_ASSIST_PREVIEW_COMPRESSION_POLICY,
      }),
    ).toEqual({
      ownership: draft.ownership,
      mode: 'plan',
      compression: AI_ASSIST_PREVIEW_COMPRESSION_POLICY,
      context: {
        rawAttachments: [
          {
            attachmentId: 'raw::firmware::sample.bin::ABC123',
            source: {
              sourceId: 'firmware::sample.bin::ABC123',
              kind: 'firmware-summary',
              version: '2026-05-26T08:30:00.000Z',
              fingerprint: 'ABC123',
            },
            includedFields: ['fileName', 'size', 'checksum', 'loadedAt'],
          },
        ],
        retrievedContextRefs: [
          {
            sourceId: 'workspace::local-workspace',
            kind: 'workspace-metadata',
          },
          {
            sourceId: 'project::dashboard-plugin-validation',
            kind: 'project-metadata',
          },
          {
            sourceId: 'session::dashboard-session',
            kind: 'session-metadata',
          },
          {
            sourceId: 'firmware::sample.bin::ABC123',
            kind: 'firmware-summary',
            version: '2026-05-26T08:30:00.000Z',
            fingerprint: 'ABC123',
          },
        ],
      },
    });
  });

  it('returns the preview provider catalog when no Tauri bridge is available', async () => {
    const service = createAiService();

    await expect(service.listProviders()).resolves.toEqual(PREVIEW_AI_PROVIDER_CATALOG);
  });

  it('builds preview requests with explicit preview provider defaults', () => {
    const service = createAiService();
    const preview = service.buildDraftPreviewRequests({ draft });

    expect(preview.prepareContextSnapshotRequest.compression).toEqual(
      AI_ASSIST_PREVIEW_COMPRESSION_POLICY,
    );
    expect(preview.sendAiChatRequest.providerId).toBe(AI_ASSIST_PREVIEW_PROVIDER_ID);
    expect(preview.sendAiChatRequest.modelId).toBe(AI_ASSIST_PREVIEW_MODEL_ID);
    expect(preview.sendAiChatRequest.context).toEqual(
      preview.prepareContextSnapshotRequest.context,
    );
  });

  it('uses a custom provider and model when building preview requests', () => {
    const service = createAiService();
    const preview = service.buildDraftPreviewRequests({
      draft,
      providerId: 'ollama',
      modelId: 'llama3.1:8b',
    });

    expect(preview.sendAiChatRequest.providerId).toBe('ollama');
    expect(preview.sendAiChatRequest.modelId).toBe('llama3.1:8b');
  });

  it('rejects blank provider identifiers when building a chat request', () => {
    const service = createAiService();

    expect(() =>
      service.buildSendAiChatRequest({
        draft,
        providerId: '   ',
      }),
    ).toThrow('providerId must be a non-empty string.');
  });

  it('passes the snapshot request to the Tauri bridge', async () => {
    const response: PrepareContextSnapshotResponse = {
      snapshot: {
        snapshotId: 'preview::snapshot::plan::local-workspace::4::1',
        workspaceId: draft.ownership.workspaceId,
        projectId: draft.ownership.projectId,
        sessionId: draft.ownership.sessionId,
        mode: 'plan',
        sourceRefs: [],
        summaryText: 'preview',
        unresolvedAssumptions: [],
        safetyWarnings: [],
        acceptedDecisionRefs: [],
        rejectedDecisionRefs: [],
        reviewStatus: 'pending',
        metadata: {
          strategy: 'summary',
          status: 'fresh',
          lossy: false,
          createdAt: 'preview-generated',
        },
      },
    };
    const invokeCommand = jest.fn(async () => response);
    const service = createAiService(invokeCommand as unknown as TauriInvoke);
    const request = service.buildDraftPreviewRequests({ draft }).prepareContextSnapshotRequest;

    await expect(service.prepareContextSnapshot(request)).resolves.toEqual(response);
    expect(invokeCommand).toHaveBeenCalledWith('prepare_context_snapshot', {
      request,
    });
  });

  it('passes the provider catalog request to the Tauri bridge', async () => {
    const response: ListAiProvidersResponse = {
      providers: [
        {
          providerId: 'ollama',
          displayName: 'Ollama',
          connectionStatus: 'connected',
          capabilityIds: ['text-chat', 'streaming', 'local-only'],
          defaultModelId: 'llama3.1:8b',
          models: [
            {
              modelId: 'llama3.1:8b',
              displayName: 'Llama 3.1 8B',
            },
          ],
        },
      ],
    };
    const invokeCommand = jest.fn(async () => response);
    const service = createAiService(invokeCommand as unknown as TauriInvoke);

    await expect(service.listProviders()).resolves.toEqual(response);
    expect(invokeCommand).toHaveBeenCalledWith('list_ai_providers');
  });

  it('passes the chat request to the Tauri bridge', async () => {
    const response: SendAiChatResponse = {
      responseKind: 'plan',
      summaryText: 'Preview only',
      reviewStatus: 'pending',
    };
    const invokeCommand = jest.fn(async () => response);
    const service = createAiService(invokeCommand as unknown as TauriInvoke);
    const request = service.buildDraftPreviewRequests({ draft }).sendAiChatRequest;

    await expect(service.sendAiChat(request)).resolves.toEqual(response);
    expect(invokeCommand).toHaveBeenCalledWith('send_ai_chat', {
      request,
    });
  });

  it('rejects empty workspace ownership before invoking Tauri', async () => {
    const invokeCommand = jest.fn(async () => undefined);
    const service = createAiService(invokeCommand as unknown as TauriInvoke);

    await expect(
      service.prepareContextSnapshot({
        ownership: {
          workspaceId: '   ',
        },
        mode: 'ask',
        context: {
          rawAttachments: [],
          retrievedContextRefs: [],
        },
      }),
    ).rejects.toEqual({
      code: 'invalid-ai-workspace',
      message: 'ownership.workspaceId must be a non-empty string.',
    });
    expect(invokeCommand).not.toHaveBeenCalled();
  });

  it('normalizes provider catalog bridge errors into an AI command error shape', async () => {
    const invokeCommand = jest.fn(async () => {
      throw new Error('provider catalog failed');
    });
    const service = createAiService(invokeCommand as unknown as TauriInvoke);

    await expect(service.listProviders()).rejects.toEqual({
      code: 'ai-command-failed',
      message: 'provider catalog failed',
    });
  });
});
