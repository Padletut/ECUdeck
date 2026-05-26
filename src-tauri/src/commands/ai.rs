use crate::contracts::{
    AiCommandError, AiProviderCapability, AiProviderConnectionStatus,
    AiProviderModelSummary, AiProviderSummary, AiRequestMode, AiResponseKind,
    CompressedContextSnapshot, CompressionMetadata, CompressionStrategy,
    ListAiProvidersResponse, PrepareContextSnapshotRequest,
    PrepareContextSnapshotResponse, ProposalContextReference, SendAiChatRequest,
    ReviewDecisionStatus, SendAiChatResponse, SnapshotStatus,
};

#[tauri::command]
pub fn list_ai_providers() -> Result<ListAiProvidersResponse, AiCommandError> {
    Ok(ListAiProvidersResponse {
        providers: preview_provider_catalog(),
    })
}

#[tauri::command]
pub fn prepare_context_snapshot(
    request: PrepareContextSnapshotRequest,
) -> Result<PrepareContextSnapshotResponse, AiCommandError> {
    validate_workspace_id(&request.ownership.workspace_id)?;

    let compression_strategy = request
        .compression
        .as_ref()
        .and_then(|policy| policy.strategy.clone())
        .unwrap_or(CompressionStrategy::None);
    let lossy = request
        .compression
        .as_ref()
        .and_then(|policy| policy.allow_lossy_compression)
        .unwrap_or(false);
    let target_token_budget = request
        .compression
        .as_ref()
        .and_then(|policy| policy.target_token_budget);

    let retrieved_ref_count = request.context.retrieved_context_refs.len();
    let raw_attachment_count = request.context.raw_attachments.len();
    let compressed_snapshot_count = usize::from(request.context.compressed_snapshot.is_some());
    let estimated_input_tokens =
        Some(((retrieved_ref_count + raw_attachment_count + compressed_snapshot_count) as u32) * 64);
    let estimated_snapshot_tokens = target_token_budget.or_else(|| {
        estimated_input_tokens.map(|token_count| token_count.min(1600))
    });

    let mut unresolved_assumptions = Vec::new();
    if retrieved_ref_count == 0 {
        unresolved_assumptions
            .push("No retrieved context refs were supplied to this preview snapshot.".to_string());
    }

    let mut safety_warnings = Vec::new();
    if lossy {
        safety_warnings
            .push("Lossy compression was requested for this preview snapshot.".to_string());
    }
    if raw_attachment_count == 0 {
        safety_warnings.push(
            "No raw attachments were supplied; preview output is based on retrieved references only."
                .to_string(),
        );
    }

    Ok(PrepareContextSnapshotResponse {
        snapshot: CompressedContextSnapshot {
            snapshot_id: build_snapshot_id(&request),
            workspace_id: request.ownership.workspace_id.clone(),
            project_id: request.ownership.project_id.clone(),
            session_id: request.ownership.session_id.clone(),
            mode: request.mode.clone(),
            source_refs: request.context.retrieved_context_refs.clone(),
            summary_text: format!(
                "Preview snapshot for {} mode with {} retrieved refs, {} raw attachments, and {} compressed inputs.",
                mode_label(&request.mode),
                retrieved_ref_count,
                raw_attachment_count,
                compressed_snapshot_count,
            ),
            unresolved_assumptions,
            safety_warnings,
            accepted_decision_refs: Vec::new(),
            rejected_decision_refs: Vec::new(),
            review_status: ReviewDecisionStatus::Pending,
            reviewed_at: None,
            metadata: CompressionMetadata {
                strategy: compression_strategy,
                status: SnapshotStatus::Fresh,
                lossy,
                target_token_budget,
                estimated_input_tokens,
                estimated_snapshot_tokens,
                created_at: "preview-generated".to_string(),
            },
        },
    })
}

#[tauri::command]
pub fn send_ai_chat(request: SendAiChatRequest) -> Result<SendAiChatResponse, AiCommandError> {
    validate_workspace_id(&request.ownership.workspace_id)?;
    validate_provider_id(&request.provider_id)?;
    validate_prompt(&request.prompt)?;

    let response_kind = response_kind_for_mode(&request.mode);
    let should_create_proposal = matches!(&request.mode, AiRequestMode::Agent | AiRequestMode::Review);
    let provider_label = request.provider_id.trim();
    let model_label = request
        .model_id
        .as_deref()
        .map(str::trim)
        .filter(|model_id| !model_id.is_empty())
        .map(|model_id| format!("/{model_id}"))
        .unwrap_or_default();
    let snapshot_segment = request
        .context_snapshot_id
        .as_ref()
        .map(|snapshot_id| format!(" using snapshot {snapshot_id}"))
        .unwrap_or_else(|| " without a prepared snapshot".to_string());

    Ok(SendAiChatResponse {
        response_kind,
        summary_text: format!(
            "Preview only: would route {} mode request to provider {}{} with {} retrieved refs and {} raw attachments{}.",
            mode_label(&request.mode),
            provider_label,
            model_label,
            request.context.retrieved_context_refs.len(),
            request.context.raw_attachments.len(),
            snapshot_segment,
        ),
        review_status: ReviewDecisionStatus::Pending,
        reviewed_at: None,
        proposal: if should_create_proposal {
            Some(ProposalContextReference {
                proposal_id: build_proposal_id(&request),
                context_snapshot_id: request.context_snapshot_id.clone(),
                review_status: ReviewDecisionStatus::Pending,
                reviewed_at: None,
            })
        } else {
            None
        },
    })
}

fn validate_workspace_id(workspace_id: &str) -> Result<(), AiCommandError> {
    if workspace_id.trim().is_empty() {
        return Err(AiCommandError {
            code: "invalid-ai-workspace".to_string(),
            message: "ownership.workspaceId must be a non-empty string.".to_string(),
        });
    }

    Ok(())
}

fn validate_provider_id(provider_id: &str) -> Result<(), AiCommandError> {
    if provider_id.trim().is_empty() {
        return Err(AiCommandError {
            code: "invalid-ai-provider".to_string(),
            message: "providerId must be a non-empty string.".to_string(),
        });
    }

    Ok(())
}

fn validate_prompt(prompt: &str) -> Result<(), AiCommandError> {
    if prompt.trim().is_empty() {
        return Err(AiCommandError {
            code: "invalid-ai-prompt".to_string(),
            message: "prompt must be a non-empty string.".to_string(),
        });
    }

    Ok(())
}

fn response_kind_for_mode(mode: &AiRequestMode) -> AiResponseKind {
    match mode {
        AiRequestMode::Ask => AiResponseKind::Explanation,
        AiRequestMode::Plan => AiResponseKind::Plan,
        AiRequestMode::Agent | AiRequestMode::Review => AiResponseKind::Proposal,
    }
}

fn mode_label(mode: &AiRequestMode) -> &'static str {
    match mode {
        AiRequestMode::Ask => "ask",
        AiRequestMode::Plan => "plan",
        AiRequestMode::Agent => "agent",
        AiRequestMode::Review => "review",
    }
}

fn build_snapshot_id(request: &PrepareContextSnapshotRequest) -> String {
    format!(
        "preview::snapshot::{}::{}::{}::{}",
        mode_label(&request.mode),
        request.ownership.workspace_id,
        request.context.retrieved_context_refs.len(),
        request.context.raw_attachments.len(),
    )
}

fn build_proposal_id(request: &SendAiChatRequest) -> String {
    format!(
        "preview::proposal::{}::{}::{}",
        mode_label(&request.mode),
        request.ownership.workspace_id,
        request.provider_id.trim(),
    )
}

fn preview_provider_catalog() -> Vec<AiProviderSummary> {
    vec![
        AiProviderSummary {
            provider_id: "preview-provider".to_string(),
            display_name: "Preview Provider".to_string(),
            connection_status: AiProviderConnectionStatus::Connected,
            capability_ids: vec![
                AiProviderCapability::TextChat,
                AiProviderCapability::StructuredOutput,
                AiProviderCapability::LocalOnly,
            ],
            default_model_id: Some("draft-preview".to_string()),
            models: vec![AiProviderModelSummary {
                model_id: "draft-preview".to_string(),
                display_name: "Draft Preview".to_string(),
            }],
        },
        AiProviderSummary {
            provider_id: "ollama".to_string(),
            display_name: "Ollama".to_string(),
            connection_status: AiProviderConnectionStatus::Disconnected,
            capability_ids: vec![
                AiProviderCapability::TextChat,
                AiProviderCapability::Streaming,
                AiProviderCapability::StructuredOutput,
                AiProviderCapability::LongContext,
                AiProviderCapability::LocalOnly,
            ],
            default_model_id: Some("llama3.1:8b".to_string()),
            models: vec![
                AiProviderModelSummary {
                    model_id: "llama3.1:8b".to_string(),
                    display_name: "Llama 3.1 8B".to_string(),
                },
                AiProviderModelSummary {
                    model_id: "qwen2.5-coder:7b".to_string(),
                    display_name: "Qwen 2.5 Coder 7B".to_string(),
                },
            ],
        },
        AiProviderSummary {
            provider_id: "llama-server".to_string(),
            display_name: "Llama Server".to_string(),
            connection_status: AiProviderConnectionStatus::Disconnected,
            capability_ids: vec![
                AiProviderCapability::TextChat,
                AiProviderCapability::Streaming,
                AiProviderCapability::LocalOnly,
            ],
            default_model_id: Some("local-instruct-8b".to_string()),
            models: vec![AiProviderModelSummary {
                model_id: "local-instruct-8b".to_string(),
                display_name: "Local Instruct 8B".to_string(),
            }],
        },
        AiProviderSummary {
            provider_id: "openai-compatible".to_string(),
            display_name: "OpenAI-Compatible".to_string(),
            connection_status: AiProviderConnectionStatus::Disconnected,
            capability_ids: vec![
                AiProviderCapability::TextChat,
                AiProviderCapability::Streaming,
                AiProviderCapability::StructuredOutput,
                AiProviderCapability::LongContext,
            ],
            default_model_id: Some("gpt-4.1-mini".to_string()),
            models: vec![
                AiProviderModelSummary {
                    model_id: "gpt-4.1-mini".to_string(),
                    display_name: "GPT-4.1 Mini".to_string(),
                },
                AiProviderModelSummary {
                    model_id: "gpt-4.1".to_string(),
                    display_name: "GPT-4.1".to_string(),
                },
            ],
        },
    ]
}