use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AiRequestMode {
    Ask,
    Plan,
    Agent,
    Review,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ContextSourceKind {
    ChatTurn,
    WorkspaceMetadata,
    ProjectMetadata,
    SessionMetadata,
    FirmwareSummary,
    MapSelection,
    PluginReference,
    PluginValidation,
    Proposal,
    Review,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum CompressionStrategy {
    None,
    Summary,
    HierarchicalSummary,
    BudgetedPack,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum SnapshotStatus {
    Fresh,
    Stale,
    Invalidated,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ReviewDecisionStatus {
    Pending,
    Accepted,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ContextEventType {
    ContextSnapshotCreated,
    ContextSnapshotRefreshed,
    ContextSnapshotInvalidated,
    ContextCompressionFailed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AiResponseKind {
    Explanation,
    Plan,
    Proposal,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AiProviderConnectionStatus {
    Connected,
    Degraded,
    Disconnected,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AiProviderCapability {
    TextChat,
    Streaming,
    StructuredOutput,
    ToolOrchestration,
    LongContext,
    LocalOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ContextSourceRef {
    pub source_id: String,
    pub kind: ContextSourceKind,
    pub version: Option<String>,
    pub fingerprint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RawContextAttachment {
    pub attachment_id: String,
    pub source: ContextSourceRef,
    pub included_fields: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CompressionPolicy {
    pub strategy: Option<CompressionStrategy>,
    pub target_token_budget: Option<u32>,
    pub allow_lossy_compression: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CompressionMetadata {
    pub strategy: CompressionStrategy,
    pub status: SnapshotStatus,
    pub lossy: bool,
    pub target_token_budget: Option<u32>,
    pub estimated_input_tokens: Option<u32>,
    pub estimated_snapshot_tokens: Option<u32>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CompressedContextSnapshot {
    pub snapshot_id: String,
    pub workspace_id: String,
    pub project_id: Option<String>,
    pub session_id: Option<String>,
    pub mode: AiRequestMode,
    pub source_refs: Vec<ContextSourceRef>,
    pub summary_text: String,
    pub unresolved_assumptions: Vec<String>,
    pub safety_warnings: Vec<String>,
    pub accepted_decision_refs: Vec<String>,
    pub rejected_decision_refs: Vec<String>,
    pub review_status: ReviewDecisionStatus,
    pub reviewed_at: Option<String>,
    pub metadata: CompressionMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiRequestOwnership {
    pub workspace_id: String,
    pub project_id: Option<String>,
    pub session_id: Option<String>,
    pub firmware_ids: Option<Vec<String>>,
    pub plugin_reference_ids: Option<Vec<String>>,
    pub review_proposal_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiRequestContextEnvelope {
    pub raw_attachments: Vec<RawContextAttachment>,
    pub retrieved_context_refs: Vec<ContextSourceRef>,
    pub compressed_snapshot: Option<CompressedContextSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PrepareContextSnapshotRequest {
    pub ownership: AiRequestOwnership,
    pub mode: AiRequestMode,
    pub context: AiRequestContextEnvelope,
    pub compression: Option<CompressionPolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PrepareContextSnapshotResponse {
    pub snapshot: CompressedContextSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RefreshContextSnapshotRequest {
    pub snapshot_id: String,
    pub ownership: AiRequestOwnership,
    pub context: AiRequestContextEnvelope,
    pub compression: Option<CompressionPolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RefreshContextSnapshotResponse {
    pub snapshot: CompressedContextSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SendAiChatRequest {
    pub provider_id: String,
    pub model_id: Option<String>,
    pub mode: AiRequestMode,
    pub prompt: String,
    pub ownership: AiRequestOwnership,
    pub context: AiRequestContextEnvelope,
    pub context_snapshot_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderModelSummary {
    pub model_id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderSummary {
    pub provider_id: String,
    pub display_name: String,
    pub connection_status: AiProviderConnectionStatus,
    pub capability_ids: Vec<AiProviderCapability>,
    pub default_model_id: Option<String>,
    pub models: Vec<AiProviderModelSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ListAiProvidersResponse {
    pub providers: Vec<AiProviderSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SendAiChatResponse {
    pub response_kind: AiResponseKind,
    pub summary_text: String,
    pub review_status: ReviewDecisionStatus,
    pub reviewed_at: Option<String>,
    pub proposal: Option<ProposalContextReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProposalContextReference {
    pub proposal_id: String,
    pub context_snapshot_id: Option<String>,
    pub review_status: ReviewDecisionStatus,
    pub reviewed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ContextSnapshotEvent {
    pub event_type: ContextEventType,
    pub snapshot_id: Option<String>,
    pub ownership: AiRequestOwnership,
    pub occurred_at: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiCommandError {
    pub code: String,
    pub message: String,
}