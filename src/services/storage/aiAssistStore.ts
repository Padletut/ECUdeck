import {
  DEFAULT_AI_ASSIST_MODEL_ID,
  DEFAULT_AI_ASSIST_PROVIDER_ID,
  type AiAssistMode,
  type AiAssistProviderConfig,
  type AiAssistReviewDecision,
  type AiAssistReviewDecisionDetails,
  type AiAssistReviewDecisionType,
  type AiAssistReviewStatus,
  type AiAssistSurface,
  type PersistedAiAssistNativePreview,
  type PersistedAiAssistProposalReview,
  type PersistedAiAssistState,
} from '../../shared/types/aiAssist';
import type { PluginReferenceOwnership } from '../../shared/types/plugins';

const STORAGE_PREFIX = 'ecudeck.ai-assist.v1';
const MAX_PREVIEW_HISTORY = 6;
const MAX_PROPOSAL_REVIEW_LOG = 12;

const LEGACY_PRESET_MIGRATIONS: Record<string, { mode: AiAssistMode; prompt: string }> = {
  'map-region-summary': {
    mode: 'ask',
    prompt:
      'Summarize likely map regions in the current firmware scope and explain which areas deserve deterministic follow-up first.',
  },
  'bosch-pattern-compare': {
    mode: 'ask',
    prompt:
      'Compare the current firmware context against common Bosch patterns and highlight the strongest matches plus any mismatches that matter.',
  },
  'first-pass-review': {
    mode: 'plan',
    prompt:
      'Generate a first-pass review plan for this firmware scope, including the safest deterministic checks to run before deeper analysis.',
  },
  'plugin-contract-explainer': {
    mode: 'ask',
    prompt:
      'Explain the active plugin contract, the important required fields, and which parts of the current plugin context need the most attention first.',
  },
  'plugin-validation-fix': {
    mode: 'plan',
    prompt:
      'Review the current plugin validation context and propose the smallest safe set of fixes, ordered by impact and compatibility risk.',
  },
  'plugin-review-plan': {
    mode: 'plan',
    prompt:
      'Prepare a review-oriented plugin change plan that highlights contract risks, compatibility concerns, and what should remain user-approved before apply.',
  },
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface AiAssistScopeInput {
  ownership: PluginReferenceOwnership;
  surface?: AiAssistSurface;
}

interface UpdateModeInput extends AiAssistScopeInput {
  mode: AiAssistMode;
}

interface UpdateDraftPromptInput extends AiAssistScopeInput {
  draftPrompt: string;
}

interface RecordNativePreviewInput extends AiAssistScopeInput {
  preview: PersistedAiAssistNativePreview;
}

interface UpdateProviderConfigInput extends AiAssistScopeInput {
  providerConfig: AiAssistProviderConfig;
}

interface RestorePreviewContextInput extends AiAssistScopeInput {
  preview: PersistedAiAssistNativePreview;
}

interface UpdatePreviewReviewStatusInput extends AiAssistScopeInput {
  snapshotId: string;
  reviewStatus: AiAssistReviewStatus;
  reviewDetails?: AiAssistReviewDecisionDetails;
  decidedAt?: string;
}

type AiAssistReviewDecisionInput = Omit<AiAssistReviewDecision, 'decisionType'> & {
  decisionType?: AiAssistReviewDecisionType;
};

type PersistedAiAssistNativePreviewInput = Omit<
  PersistedAiAssistNativePreview,
  'reviewDecision' | 'mode' | 'prompt'
> & {
  mode?: AiAssistMode;
  prompt?: string;
  presetId?: string;
  reviewDecision?: AiAssistReviewDecisionInput;
};

type PersistedAiAssistProposalReviewInput = Omit<
  PersistedAiAssistProposalReview,
  'mode' | 'promptText' | 'reviewDecision'
> & {
  mode?: AiAssistMode;
  promptText?: string;
  presetId?: string;
  reviewDecision?: AiAssistReviewDecisionInput;
};

export interface AiAssistStore {
  loadState(scope: PluginReferenceOwnership | AiAssistScopeInput): PersistedAiAssistState;
  updateMode(input: UpdateModeInput): PersistedAiAssistState;
  updateDraftPrompt(input: UpdateDraftPromptInput): PersistedAiAssistState;
  recordNativePreview(input: RecordNativePreviewInput): PersistedAiAssistState;
  updateProviderConfig(input: UpdateProviderConfigInput): PersistedAiAssistState;
  restorePreviewContext(input: RestorePreviewContextInput): PersistedAiAssistState;
  updatePreviewReviewStatus(input: UpdatePreviewReviewStatusInput): PersistedAiAssistState;
}

export function createAiAssistStore(storage: StorageLike | null | undefined): AiAssistStore {
  return {
    loadState(scope: PluginReferenceOwnership | AiAssistScopeInput): PersistedAiAssistState {
      return loadPersistedState(storage, resolveScope(scope));
    },

    updateMode(input: UpdateModeInput): PersistedAiAssistState {
      const scope = resolveScope(input);
      const currentState = loadPersistedState(storage, scope);
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: scope.ownership,
        surface: scope.surface,
        selectedMode: input.mode,
      };

      persistState(storage, nextState);
      return nextState;
    },

    updateDraftPrompt(input: UpdateDraftPromptInput): PersistedAiAssistState {
      const scope = resolveScope(input);
      const currentState = loadPersistedState(storage, scope);
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: scope.ownership,
        surface: scope.surface,
        draftPrompt: input.draftPrompt,
      };

      persistState(storage, nextState);
      return nextState;
    },

    recordNativePreview(input: RecordNativePreviewInput): PersistedAiAssistState {
      const scope = resolveScope(input);
      const currentState = loadPersistedState(storage, scope);
      const normalizedPreview = normalizeNativePreview(input.preview);
      const proposalReviews = mergeProposalReviewLogEntry(
        currentState.proposalReviews,
        buildProposalReviewEntry(normalizedPreview),
      );
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: scope.ownership,
        surface: scope.surface,
        lastNativePreview: normalizedPreview,
        previewHistory: mergePreviewHistory(currentState.previewHistory ?? [], normalizedPreview),
        proposalReviews,
      };

      persistState(storage, nextState);
      return nextState;
    },

    updateProviderConfig(input: UpdateProviderConfigInput): PersistedAiAssistState {
      const scope = resolveScope(input);
      const currentState = loadPersistedState(storage, scope);
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: scope.ownership,
        surface: scope.surface,
        providerConfig: normalizeProviderConfig(input.providerConfig),
      };

      persistState(storage, nextState);
      return nextState;
    },

    restorePreviewContext(input: RestorePreviewContextInput): PersistedAiAssistState {
      const scope = resolveScope(input);
      const currentState = loadPersistedState(storage, scope);
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: scope.ownership,
        surface: scope.surface,
        selectedMode: input.preview.mode,
        draftPrompt: input.preview.prompt,
        providerConfig: normalizeProviderConfig(input.preview.providerConfig),
      };

      persistState(storage, nextState);
      return nextState;
    },

    updatePreviewReviewStatus(input: UpdatePreviewReviewStatusInput): PersistedAiAssistState {
      const scope = resolveScope(input);
      const currentState = loadPersistedState(storage, scope);
      const reviewDecision = normalizeReviewDecision(
        {
          status: input.reviewStatus,
          ...input.reviewDetails,
          decidedAt: input.decidedAt,
        },
        undefined,
      );
      const previewHistory = updatePreviewHistoryReviewStatus(
        currentState.previewHistory ?? [],
        input.snapshotId,
        reviewDecision,
      );
      const lastNativePreview =
        currentState.lastNativePreview?.snapshotResponse.snapshot.snapshotId === input.snapshotId
          ? applyReviewDecisionToPreviewContracts({
              ...currentState.lastNativePreview,
              reviewDecision,
            })
          : currentState.lastNativePreview;
      const matchingPreview =
        previewHistory?.find(
          (preview) => preview.snapshotResponse.snapshot.snapshotId === input.snapshotId,
        ) ??
        (lastNativePreview?.snapshotResponse.snapshot.snapshotId === input.snapshotId
          ? lastNativePreview
          : undefined);
      const proposalReviews = updateProposalReviewLogStatus(
        currentState.proposalReviews,
        input.snapshotId,
        reviewDecision,
        matchingPreview,
      );
      const nextState: PersistedAiAssistState = {
        ...currentState,
        ownership: scope.ownership,
        surface: scope.surface,
        lastNativePreview,
        previewHistory,
        proposalReviews,
      };

      persistState(storage, nextState);
      return nextState;
    },
  };
}

export const aiAssistStore = createAiAssistStore(getBrowserStorage());

function resolveScope(scope: PluginReferenceOwnership | AiAssistScopeInput): {
  ownership: PluginReferenceOwnership;
  surface: AiAssistSurface;
} {
  if ('workspaceId' in scope) {
    return {
      ownership: scope,
      surface: 'map-editor',
    };
  }

  return {
    ownership: scope.ownership,
    surface: scope.surface ?? 'map-editor',
  };
}

function loadPersistedState(
  storage: StorageLike | null | undefined,
  scope: AiAssistScopeInput,
): PersistedAiAssistState {
  if (!storage) {
    return emptyState(scope);
  }

  const raw = storage.getItem(storageKey(scope));

  if (!raw) {
    return emptyState(scope);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedAiAssistState>;
    const lastNativePreview = normalizePersistedPreview(parsed.lastNativePreview);
    const previewHistory = normalizePreviewHistory(parsed.previewHistory, lastNativePreview);
    const proposalReviews = normalizeProposalReviewLog(parsed.proposalReviews, previewHistory);
    const nextState: PersistedAiAssistState = {
      ownership: scope.ownership,
      surface: scope.surface ?? 'map-editor',
    };

    const selectedMode = isAiAssistMode(parsed.selectedMode) ? parsed.selectedMode : undefined;
    const draftPrompt = normalizeOptionalText(parsed.draftPrompt);
    const providerConfig = isAiAssistProviderConfig(parsed.providerConfig)
      ? normalizeProviderConfig(parsed.providerConfig)
      : undefined;

    if (selectedMode) {
      nextState.selectedMode = selectedMode;
    }

    if (draftPrompt) {
      nextState.draftPrompt = draftPrompt;
    }

    if (providerConfig) {
      nextState.providerConfig = providerConfig;
    }

    if (lastNativePreview) {
      nextState.lastNativePreview = lastNativePreview;
    }

    if (previewHistory) {
      nextState.previewHistory = previewHistory;
    }

    if (proposalReviews) {
      nextState.proposalReviews = proposalReviews;
    }

    return nextState;
  } catch {
    return emptyState(scope);
  }
}

function persistState(
  storage: StorageLike | null | undefined,
  state: PersistedAiAssistState,
): void {
  if (!storage) {
    return;
  }

  storage.setItem(
    storageKey({
      ownership: state.ownership,
      surface: state.surface,
    }),
    JSON.stringify(state),
  );
}

function emptyState(scope: AiAssistScopeInput): PersistedAiAssistState {
  return {
    ownership: scope.ownership,
    surface: scope.surface ?? 'map-editor',
  };
}

function storageKey(scope: AiAssistScopeInput): string {
  return [
    STORAGE_PREFIX,
    scope.surface ?? 'map-editor',
    scope.ownership.workspaceId,
    scope.ownership.projectId ?? '_',
    scope.ownership.sessionId ?? '_',
  ].join('::');
}

function isAiAssistMode(value: unknown): value is AiAssistMode {
  return value === 'ask' || value === 'plan' || value === 'agent';
}

function isAiAssistProviderConfig(value: unknown): value is AiAssistProviderConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.providerId === 'string' &&
    (candidate.modelId == null || typeof candidate.modelId === 'string')
  );
}

function isAiAssistReviewStatus(value: unknown): value is AiAssistReviewStatus {
  return value === 'pending' || value === 'accepted' || value === 'rejected';
}

function isAiAssistReviewDecisionType(value: unknown): value is AiAssistReviewDecisionType {
  return (
    value === 'approve' || value === 'reject' || value === 'needs-follow-up' || value === 'note'
  );
}

function isAiAssistReviewDecision(value: unknown): value is AiAssistReviewDecisionInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isAiAssistReviewStatus(candidate.status) &&
    (candidate.decisionType == null || isAiAssistReviewDecisionType(candidate.decisionType)) &&
    (candidate.reviewerId == null || typeof candidate.reviewerId === 'string') &&
    (candidate.comment == null || typeof candidate.comment === 'string') &&
    (candidate.decidedAt == null || typeof candidate.decidedAt === 'string')
  );
}

function isPersistedAiAssistNativePreview(
  value: unknown,
): value is PersistedAiAssistNativePreviewInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.draftKey === 'string' &&
    (candidate.mode == null || isAiAssistMode(candidate.mode)) &&
    (candidate.prompt == null || typeof candidate.prompt === 'string') &&
    (candidate.presetId == null || typeof candidate.presetId === 'string') &&
    (candidate.providerConfig == null || isAiAssistProviderConfig(candidate.providerConfig)) &&
    (candidate.recordedAt == null || typeof candidate.recordedAt === 'string') &&
    (candidate.reviewDecision == null || isAiAssistReviewDecision(candidate.reviewDecision)) &&
    isPrepareContextSnapshotResponse(candidate.snapshotResponse) &&
    isSendAiChatResponse(candidate.chatResponse)
  );
}

function isPersistedAiAssistProposalReview(
  value: unknown,
): value is PersistedAiAssistProposalReviewInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.proposalId === 'string' &&
    typeof candidate.snapshotId === 'string' &&
    (candidate.mode == null || isAiAssistMode(candidate.mode)) &&
    (candidate.promptText == null || typeof candidate.promptText === 'string') &&
    (candidate.presetId == null || typeof candidate.presetId === 'string') &&
    isAiAssistProviderConfig(candidate.providerConfig) &&
    typeof candidate.summaryText === 'string' &&
    (candidate.reviewDecision == null || isAiAssistReviewDecision(candidate.reviewDecision)) &&
    typeof candidate.recordedAt === 'string'
  );
}

function isPrepareContextSnapshotResponse(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (!candidate.snapshot || typeof candidate.snapshot !== 'object') {
    return false;
  }

  const snapshot = candidate.snapshot as Record<string, unknown>;
  return (
    typeof snapshot.snapshotId === 'string' &&
    typeof snapshot.summaryText === 'string' &&
    (snapshot.acceptedDecisionRefs == null || isStringArray(snapshot.acceptedDecisionRefs)) &&
    (snapshot.rejectedDecisionRefs == null || isStringArray(snapshot.rejectedDecisionRefs)) &&
    (snapshot.reviewStatus == null || isAiAssistReviewStatus(snapshot.reviewStatus)) &&
    (snapshot.reviewedAt == null || typeof snapshot.reviewedAt === 'string') &&
    isCompressionMetadata(snapshot.metadata)
  );
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isCompressionMetadata(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.strategy === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.lossy === 'boolean' &&
    typeof candidate.createdAt === 'string'
  );
}

function isSendAiChatResponse(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isResponseKind(candidate.responseKind) &&
    typeof candidate.summaryText === 'string' &&
    (candidate.reviewStatus == null || isAiAssistReviewStatus(candidate.reviewStatus)) &&
    (candidate.reviewedAt == null || typeof candidate.reviewedAt === 'string') &&
    isProposalContextReference(candidate.proposal)
  );
}

function isResponseKind(value: unknown): boolean {
  return value === 'explanation' || value === 'plan' || value === 'proposal';
}

function isProposalContextReference(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.proposalId === 'string' &&
    (candidate.contextSnapshotId == null || typeof candidate.contextSnapshotId === 'string') &&
    (candidate.reviewStatus == null || isAiAssistReviewStatus(candidate.reviewStatus)) &&
    (candidate.reviewedAt == null || typeof candidate.reviewedAt === 'string')
  );
}

function normalizeNativePreview(
  preview: PersistedAiAssistNativePreviewInput,
): PersistedAiAssistNativePreview {
  const providerConfig = normalizeProviderConfig(preview.providerConfig) ?? {
    providerId: DEFAULT_AI_ASSIST_PROVIDER_ID,
    modelId: DEFAULT_AI_ASSIST_MODEL_ID,
  };
  const recordedAt =
    preview.recordedAt?.trim() || preview.snapshotResponse.snapshot.metadata.createdAt;
  const reviewDecision = normalizeReviewDecision(preview.reviewDecision, recordedAt);
  const mode = resolvePreviewMode(preview) ?? 'ask';
  const prompt = resolvePreviewPrompt(preview) ?? 'Explain the current editor context.';

  return applyReviewDecisionToPreviewContracts({
    mode,
    prompt,
    draftKey: preview.draftKey,
    providerConfig,
    recordedAt,
    reviewDecision,
    snapshotResponse: preview.snapshotResponse,
    chatResponse: {
      ...preview.chatResponse,
      proposal: preview.chatResponse.proposal ?? undefined,
    },
  });
}

function normalizePersistedPreview(value: unknown): PersistedAiAssistNativePreview | undefined {
  if (!isPersistedAiAssistNativePreview(value)) {
    return undefined;
  }

  return normalizeNativePreview(value);
}

function normalizePreviewHistory(
  value: unknown,
  lastNativePreview?: PersistedAiAssistNativePreview,
): PersistedAiAssistNativePreview[] | undefined {
  const normalizedHistory = Array.isArray(value)
    ? value
        .map((entry) => normalizePersistedPreview(entry))
        .filter((entry): entry is PersistedAiAssistNativePreview => Boolean(entry))
    : [];

  if (lastNativePreview) {
    const mergedHistory = mergePreviewHistory(normalizedHistory, lastNativePreview);
    return mergedHistory.length > 0 ? mergedHistory : undefined;
  }

  return normalizedHistory.length > 0 ? normalizedHistory.slice(0, MAX_PREVIEW_HISTORY) : undefined;
}

function normalizeProposalReviewLog(
  value: unknown,
  previewHistory?: PersistedAiAssistNativePreview[],
): PersistedAiAssistProposalReview[] | undefined {
  const normalizedLog = Array.isArray(value)
    ? value
        .map((entry) => normalizePersistedProposalReview(entry))
        .filter((entry): entry is PersistedAiAssistProposalReview => Boolean(entry))
    : [];
  const derivedLog = (previewHistory ?? [])
    .map((preview) => buildProposalReviewEntry(preview))
    .filter((entry): entry is PersistedAiAssistProposalReview => Boolean(entry));

  const mergedLog = derivedLog.reduce<PersistedAiAssistProposalReview[] | undefined>(
    (currentLog, entry) => mergeProposalReviewLogEntry(currentLog, entry),
    normalizedLog.length > 0 ? normalizedLog : undefined,
  );

  return mergedLog && mergedLog.length > 0 ? mergedLog : undefined;
}

function mergePreviewHistory(
  previewHistory: PersistedAiAssistNativePreview[],
  nextPreview: PersistedAiAssistNativePreview,
): PersistedAiAssistNativePreview[] {
  return [
    nextPreview,
    ...previewHistory.filter(
      (preview) =>
        preview.snapshotResponse.snapshot.snapshotId !==
        nextPreview.snapshotResponse.snapshot.snapshotId,
    ),
  ].slice(0, MAX_PREVIEW_HISTORY);
}

function normalizePersistedProposalReview(
  value: unknown,
): PersistedAiAssistProposalReview | undefined {
  if (!isPersistedAiAssistProposalReview(value)) {
    return undefined;
  }

  const providerConfig = normalizeProviderConfig(value.providerConfig);
  const recordedAt = value.recordedAt.trim() || value.reviewDecision?.decidedAt?.trim();
  const mode = resolveReviewMode(value);
  const promptText = resolveReviewPromptText(value);

  if (!providerConfig || !recordedAt || !mode || !promptText) {
    return undefined;
  }

  return {
    proposalId: value.proposalId,
    snapshotId: value.snapshotId,
    mode,
    promptText,
    providerConfig,
    summaryText: value.summaryText,
    reviewDecision: normalizeReviewDecision(value.reviewDecision, recordedAt),
    recordedAt,
  };
}

function buildProposalReviewEntry(
  preview: PersistedAiAssistNativePreview,
): PersistedAiAssistProposalReview | undefined {
  const proposalId = preview.chatResponse.proposal?.proposalId;

  if (!proposalId) {
    return undefined;
  }

  return {
    proposalId,
    snapshotId: preview.snapshotResponse.snapshot.snapshotId,
    mode: preview.mode,
    promptText: preview.prompt,
    providerConfig: preview.providerConfig,
    summaryText: preview.chatResponse.summaryText,
    reviewDecision: preview.reviewDecision,
    recordedAt: preview.recordedAt,
  };
}

function mergeProposalReviewLogEntry(
  proposalReviews: PersistedAiAssistProposalReview[] | undefined,
  nextProposalReview: PersistedAiAssistProposalReview | undefined,
): PersistedAiAssistProposalReview[] | undefined {
  if (!nextProposalReview) {
    return proposalReviews && proposalReviews.length > 0 ? proposalReviews : undefined;
  }

  return [
    nextProposalReview,
    ...(proposalReviews ?? []).filter(
      (entry) => entry.proposalId !== nextProposalReview.proposalId,
    ),
  ].slice(0, MAX_PROPOSAL_REVIEW_LOG);
}

function updateProposalReviewLogStatus(
  proposalReviews: PersistedAiAssistProposalReview[] | undefined,
  snapshotId: string,
  reviewDecision: AiAssistReviewDecision,
  matchingPreview?: PersistedAiAssistNativePreview,
): PersistedAiAssistProposalReview[] | undefined {
  if (matchingPreview) {
    return mergeProposalReviewLogEntry(proposalReviews, buildProposalReviewEntry(matchingPreview));
  }

  const existingEntry = proposalReviews?.find((entry) => entry.snapshotId === snapshotId);

  if (!existingEntry) {
    return proposalReviews && proposalReviews.length > 0 ? proposalReviews : undefined;
  }

  return mergeProposalReviewLogEntry(proposalReviews, {
    ...existingEntry,
    reviewDecision: normalizeReviewDecision(reviewDecision, existingEntry.recordedAt),
  });
}

function updatePreviewHistoryReviewStatus(
  previewHistory: PersistedAiAssistNativePreview[],
  snapshotId: string,
  reviewDecision: AiAssistReviewDecision,
): PersistedAiAssistNativePreview[] | undefined {
  if (previewHistory.length === 0) {
    return undefined;
  }

  return previewHistory.map((preview) =>
    preview.snapshotResponse.snapshot.snapshotId === snapshotId
      ? applyReviewDecisionToPreviewContracts({
          ...preview,
          reviewDecision,
        })
      : preview,
  );
}

function applyReviewDecisionToPreviewContracts(
  preview: PersistedAiAssistNativePreview,
): PersistedAiAssistNativePreview {
  const proposalId = preview.chatResponse.proposal?.proposalId;
  const acceptedDecisionRefs =
    preview.reviewDecision.status === 'accepted' && proposalId ? [proposalId] : [];
  const rejectedDecisionRefs =
    preview.reviewDecision.status === 'rejected' && proposalId ? [proposalId] : [];

  return {
    ...preview,
    snapshotResponse: {
      ...preview.snapshotResponse,
      snapshot: {
        ...preview.snapshotResponse.snapshot,
        acceptedDecisionRefs,
        rejectedDecisionRefs,
        reviewStatus: preview.reviewDecision.status,
        reviewedAt: preview.reviewDecision.decidedAt,
      },
    },
    chatResponse: {
      ...preview.chatResponse,
      reviewStatus: preview.reviewDecision.status,
      reviewedAt: preview.reviewDecision.decidedAt,
      proposal: preview.chatResponse.proposal
        ? {
            ...preview.chatResponse.proposal,
            reviewStatus: preview.reviewDecision.status,
            reviewedAt: preview.reviewDecision.decidedAt,
          }
        : undefined,
    },
  };
}

function normalizeProviderConfig(
  providerConfig: AiAssistProviderConfig,
): AiAssistProviderConfig | undefined {
  const providerId = providerConfig.providerId.trim();
  const modelId = providerConfig.modelId?.trim() || undefined;

  if (!providerId) {
    return undefined;
  }

  return {
    providerId,
    modelId,
  };
}

function resolvePreviewMode(value: unknown): AiAssistMode | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;

  if (isAiAssistMode(candidate.mode)) {
    return candidate.mode;
  }

  const presetId = resolveLegacyPresetId(candidate);
  return presetId ? LEGACY_PRESET_MIGRATIONS[presetId]?.mode : undefined;
}

function resolvePreviewPrompt(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const prompt = normalizeOptionalText(candidate.prompt as string | undefined);

  if (prompt) {
    return prompt;
  }

  const presetId = resolveLegacyPresetId(candidate);
  return presetId ? LEGACY_PRESET_MIGRATIONS[presetId]?.prompt : undefined;
}

function resolveReviewMode(value: unknown): AiAssistMode | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;

  if (isAiAssistMode(candidate.mode)) {
    return candidate.mode;
  }

  const presetId = typeof candidate.presetId === 'string' ? candidate.presetId : undefined;
  return presetId ? LEGACY_PRESET_MIGRATIONS[presetId]?.mode : undefined;
}

function resolveReviewPromptText(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const promptText = normalizeOptionalText(candidate.promptText as string | undefined);

  if (promptText) {
    return promptText;
  }

  const presetId = typeof candidate.presetId === 'string' ? candidate.presetId : undefined;
  return presetId ? LEGACY_PRESET_MIGRATIONS[presetId]?.prompt : undefined;
}

function resolveLegacyPresetId(candidate: Record<string, unknown>): string | undefined {
  if (typeof candidate.presetId === 'string' && candidate.presetId in LEGACY_PRESET_MIGRATIONS) {
    return candidate.presetId;
  }

  const draftKey = typeof candidate.draftKey === 'string' ? candidate.draftKey : '';
  const [maybePresetId] = draftKey.split('::');

  if (maybePresetId && maybePresetId in LEGACY_PRESET_MIGRATIONS) {
    return maybePresetId;
  }

  return undefined;
}

function defaultReviewDecisionTypeForStatus(
  status: AiAssistReviewStatus,
): AiAssistReviewDecisionType {
  switch (status) {
    case 'accepted':
      return 'approve';
    case 'rejected':
      return 'reject';
    case 'pending':
    default:
      return 'needs-follow-up';
  }
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function normalizeReviewDecision(
  reviewDecision: AiAssistReviewDecisionInput | undefined,
  recordedAt: string | undefined,
): AiAssistReviewDecision {
  if (!reviewDecision || !isAiAssistReviewStatus(reviewDecision.status)) {
    return {
      status: 'pending',
      decisionType: defaultReviewDecisionTypeForStatus('pending'),
    };
  }

  const decisionType = isAiAssistReviewDecisionType(reviewDecision.decisionType)
    ? reviewDecision.decisionType
    : defaultReviewDecisionTypeForStatus(reviewDecision.status);
  const reviewerId = normalizeOptionalText(reviewDecision.reviewerId);
  const comment = normalizeOptionalText(reviewDecision.comment);
  const decidedAt = normalizeOptionalText(reviewDecision.decidedAt) ?? recordedAt;

  if (
    reviewDecision.status === 'pending' &&
    decisionType === defaultReviewDecisionTypeForStatus('pending') &&
    !reviewerId &&
    !comment &&
    !normalizeOptionalText(reviewDecision.decidedAt)
  ) {
    return {
      status: 'pending',
      decisionType,
    };
  }

  return {
    status: reviewDecision.status,
    decisionType,
    reviewerId,
    comment,
    decidedAt: reviewDecision.status === 'pending' ? undefined : decidedAt,
  };
}

function getBrowserStorage(): StorageLike | undefined {
  if (typeof window === 'undefined' || !window.localStorage) {
    return undefined;
  }

  return window.localStorage;
}
