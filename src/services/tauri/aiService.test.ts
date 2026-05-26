import { describe, expect, it } from '@jest/globals';

import type { AiAssistDraft } from '../../shared/types/aiAssist';
import {
  AI_ASSIST_PREVIEW_COMPRESSION_POLICY,
  AI_ASSIST_PREVIEW_MODEL_ID,
  AI_ASSIST_PREVIEW_PROVIDER_ID,
  createAiService,
} from './aiService';

describe('createAiService', () => {
  const draft: AiAssistDraft = {
    preset: {
      id: 'first-pass-review',
      title: 'Generate a first-pass review plan',
      prompt:
        'Generate a first-pass review plan for this firmware scope, including the safest deterministic checks to run before deeper analysis.',
      mode: 'plan',
    },
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

  it('builds preview requests with explicit preview provider defaults', () => {
    const service = createAiService();
    const preview = service.buildDraftPreviewRequests(draft);

    expect(preview.prepareContextSnapshotRequest.compression).toEqual(
      AI_ASSIST_PREVIEW_COMPRESSION_POLICY,
    );
    expect(preview.sendAiChatRequest.providerId).toBe(AI_ASSIST_PREVIEW_PROVIDER_ID);
    expect(preview.sendAiChatRequest.modelId).toBe(AI_ASSIST_PREVIEW_MODEL_ID);
    expect(preview.sendAiChatRequest.context).toEqual(
      preview.prepareContextSnapshotRequest.context,
    );
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
});
