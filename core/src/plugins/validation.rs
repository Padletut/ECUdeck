use std::{collections::HashSet, fs, path::Path};

use serde::{Deserialize, Serialize};

use super::{
    PluginApiVersion,
    PluginCapability,
    PluginManifest,
    PluginReferenceMetadata,
    PluginRuntimeCompatibilityVersion,
    PluginSchemaVersion,
};

const SUPPORTED_COMPATIBILITY_LAYERS: &[&str] = &["runtime-v1-shim"];
const EXPORT_PATCH_CAPABILITY: &str = "export-patch";
const VALIDATE_CAPABILITY: &str = "validate";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PluginCompatibilityStatus {
    Loadable,
    Valid,
    Compatible,
    PartiallyCompatible,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PluginValidationLevel {
    Structural,
    Compatibility,
    Semantic,
    Runtime,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PluginFindingSeverity {
    Error,
    Warning,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PluginValidationFinding {
    pub level: PluginValidationLevel,
    pub severity: PluginFindingSeverity,
    pub code: String,
    pub message: String,
    pub field: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PluginValidationReport {
    pub status: PluginCompatibilityStatus,
    pub manifest_path: Option<String>,
    pub reference: Option<PluginReferenceMetadata>,
    pub findings: Vec<PluginValidationFinding>,
}

pub fn validate_plugin_manifest(manifest: &PluginManifest) -> PluginValidationReport {
    validate_plugin_manifest_with_path(manifest, None)
}

pub fn validate_plugin_manifest_file(path: impl AsRef<Path>) -> PluginValidationReport {
    let path = path.as_ref();
    let manifest_path = Some(path.display().to_string());

    match fs::read_to_string(path) {
        Ok(contents) => match serde_json::from_str::<PluginManifest>(&contents) {
            Ok(manifest) => validate_plugin_manifest_with_path(&manifest, manifest_path),
            Err(error) => PluginValidationReport {
                status: PluginCompatibilityStatus::Rejected,
                manifest_path,
                reference: None,
                findings: vec![error_finding(
                    PluginValidationLevel::Structural,
                    "manifest-parse-failed",
                    format!("Plugin manifest could not be parsed as JSON: {error}"),
                    Some("manifest"),
                )],
            },
        },
        Err(error) => {
            let code = if error.kind() == std::io::ErrorKind::NotFound {
                "manifest-not-found"
            } else {
                "manifest-unreadable"
            };

            PluginValidationReport {
                status: PluginCompatibilityStatus::Rejected,
                manifest_path,
                reference: None,
                findings: vec![error_finding(
                    PluginValidationLevel::Structural,
                    code,
                    format!("Plugin manifest could not be read: {error}"),
                    Some("manifestPath"),
                )],
            }
        }
    }
}

fn validate_plugin_manifest_with_path(
    manifest: &PluginManifest,
    manifest_path: Option<String>,
) -> PluginValidationReport {
    let mut findings = Vec::new();

    findings.extend(validate_structural(manifest));
    findings.extend(validate_semantic(manifest));
    findings.extend(validate_compatibility(manifest));
    findings.extend(validate_runtime(manifest));

    let status = derive_status(&findings);

    PluginValidationReport {
        status,
        manifest_path,
        reference: Some(manifest.reference_metadata()),
        findings,
    }
}

fn validate_structural(manifest: &PluginManifest) -> Vec<PluginValidationFinding> {
    let mut findings = Vec::new();

    if manifest.plugin_id.trim().is_empty() {
        findings.push(error_finding(
            PluginValidationLevel::Structural,
            "plugin-id-missing",
            "Plugin manifest must declare a non-empty pluginId.".to_string(),
            Some("pluginId"),
        ));
    }

    if manifest.plugin_name.trim().is_empty() {
        findings.push(error_finding(
            PluginValidationLevel::Structural,
            "plugin-name-missing",
            "Plugin manifest must declare a non-empty pluginName.".to_string(),
            Some("pluginName"),
        ));
    }

    if manifest.versions.plugin_version.trim().is_empty() {
        findings.push(error_finding(
            PluginValidationLevel::Structural,
            "plugin-version-missing",
            "Plugin manifest must declare a non-empty pluginVersion.".to_string(),
            Some("pluginVersion"),
        ));
    }

    if manifest.versions.api_version.as_str().trim().is_empty() {
        findings.push(error_finding(
            PluginValidationLevel::Structural,
            "plugin-api-version-missing",
            "Plugin manifest must declare a non-empty apiVersion.".to_string(),
            Some("apiVersion"),
        ));
    }

    if manifest.versions.schema_version.as_str().trim().is_empty() {
        findings.push(error_finding(
            PluginValidationLevel::Structural,
            "plugin-schema-version-missing",
            "Plugin manifest must declare a non-empty schemaVersion.".to_string(),
            Some("schemaVersion"),
        ));
    }

    if manifest
        .versions
        .runtime_compatibility_version
        .as_str()
        .trim()
        .is_empty()
    {
        findings.push(error_finding(
            PluginValidationLevel::Structural,
            "plugin-runtime-version-missing",
            "Plugin manifest must declare a non-empty runtimeCompatibilityVersion."
                .to_string(),
            Some("runtimeCompatibilityVersion"),
        ));
    }

    if manifest.supported_target_families.is_empty() {
        findings.push(error_finding(
            PluginValidationLevel::Structural,
            "supported-target-families-missing",
            "Plugin manifest must declare at least one supported target family.".to_string(),
            Some("supportedTargetFamilies"),
        ));
    }

    if manifest.capabilities.is_empty() {
        findings.push(error_finding(
            PluginValidationLevel::Structural,
            "capabilities-missing",
            "Plugin manifest must declare at least one capability.".to_string(),
            Some("capabilities"),
        ));
    }

    if let Some(compatibility) = &manifest.compatibility {
        if matches!(compatibility.compatibility_layer.as_deref(), Some("")) {
            findings.push(error_finding(
                PluginValidationLevel::Structural,
                "compatibility-layer-empty",
                "compatibility.compatibilityLayer cannot be an empty string.".to_string(),
                Some("compatibility.compatibilityLayer"),
            ));
        }
    }

    findings
}

fn validate_semantic(manifest: &PluginManifest) -> Vec<PluginValidationFinding> {
    let mut findings = Vec::new();
    let mut seen_capabilities = HashSet::new();
    let mut normalized_capabilities = HashSet::new();
    let mut seen_target_families = HashSet::new();

    for capability in &manifest.capabilities {
        let normalized = capability.as_str().trim().to_ascii_lowercase();

        if normalized.is_empty() {
            findings.push(error_finding(
                PluginValidationLevel::Semantic,
                "capability-empty",
                "Capability declarations cannot be empty strings.".to_string(),
                Some("capabilities"),
            ));
            continue;
        }

        if !is_known_capability(capability) {
            findings.push(error_finding(
                PluginValidationLevel::Semantic,
                "capability-unknown",
                format!("Capability '{}' is not recognized by the current runtime.", capability.as_str()),
                Some("capabilities"),
            ));
        }

        if !seen_capabilities.insert(normalized.clone()) {
            findings.push(error_finding(
                PluginValidationLevel::Semantic,
                "capability-duplicate",
                format!("Capability '{}' is declared more than once.", capability.as_str()),
                Some("capabilities"),
            ));
        }

        normalized_capabilities.insert(normalized);
    }

    for family in &manifest.supported_target_families {
        let normalized = family.trim().to_ascii_lowercase();

        if normalized.is_empty() {
            findings.push(error_finding(
                PluginValidationLevel::Semantic,
                "target-family-empty",
                "Supported target families cannot contain empty entries.".to_string(),
                Some("supportedTargetFamilies"),
            ));
            continue;
        }

        if !seen_target_families.insert(normalized) {
            findings.push(warning_finding(
                PluginValidationLevel::Semantic,
                "target-family-duplicate",
                format!("Target family '{}' is declared more than once.", family),
                Some("supportedTargetFamilies"),
            ));
        }
    }

    if normalized_capabilities.contains(EXPORT_PATCH_CAPABILITY)
        && !normalized_capabilities.contains(VALIDATE_CAPABILITY)
    {
        findings.push(error_finding(
            PluginValidationLevel::Semantic,
            "export-requires-validate",
            "Plugins that declare export-patch must also declare validate so export remains reviewable and checksum-aware."
                .to_string(),
            Some("capabilities"),
        ));
    }

    findings
}

fn validate_compatibility(manifest: &PluginManifest) -> Vec<PluginValidationFinding> {
    let mut findings = Vec::new();

    if manifest.versions.api_version != PluginApiVersion::current() {
        findings.push(error_finding(
            PluginValidationLevel::Compatibility,
            "plugin-api-version-unsupported",
            format!(
                "Plugin API version '{}' is not supported by the current runtime (expected '{}').",
                manifest.versions.api_version.as_str(),
                PluginApiVersion::current().as_str(),
            ),
            Some("apiVersion"),
        ));
    }

    if manifest.versions.schema_version != PluginSchemaVersion::current() {
        findings.push(error_finding(
            PluginValidationLevel::Compatibility,
            "plugin-schema-version-unsupported",
            format!(
                "Plugin schema version '{}' is not supported by the current runtime (expected '{}').",
                manifest.versions.schema_version.as_str(),
                PluginSchemaVersion::current().as_str(),
            ),
            Some("schemaVersion"),
        ));
    }

    findings
}

fn validate_runtime(manifest: &PluginManifest) -> Vec<PluginValidationFinding> {
    let mut findings = Vec::new();
    let current_runtime = PluginRuntimeCompatibilityVersion::current();

    let supports_current_runtime = manifest.versions.runtime_compatibility_version == current_runtime
        || manifest
            .compatibility
            .as_ref()
            .map(|compatibility| {
                compatibility
                    .supported_runtime_versions
                    .iter()
                    .any(|version| version == &current_runtime)
            })
            .unwrap_or(false);

    if supports_current_runtime {
        return findings;
    }

    let compatibility_layer = manifest
        .compatibility
        .as_ref()
        .and_then(|compatibility| compatibility.compatibility_layer.as_deref());

    if let Some(layer) = compatibility_layer {
        if SUPPORTED_COMPATIBILITY_LAYERS.contains(&layer) {
            findings.push(warning_finding(
                PluginValidationLevel::Runtime,
                "compatibility-layer-required",
                format!(
                    "Plugin requires compatibility layer '{}' because runtime version '{}' is not directly supported by '{}'.",
                    layer,
                    current_runtime.as_str(),
                    manifest.versions.runtime_compatibility_version.as_str(),
                ),
                Some("compatibility.compatibilityLayer"),
            ));

            return findings;
        }

        findings.push(error_finding(
            PluginValidationLevel::Runtime,
            "compatibility-layer-unsupported",
            format!(
                "Compatibility layer '{}' is not available in the current runtime.",
                layer,
            ),
            Some("compatibility.compatibilityLayer"),
        ));

        return findings;
    }

    findings.push(error_finding(
        PluginValidationLevel::Runtime,
        "plugin-runtime-version-unsupported",
        format!(
            "Plugin runtime compatibility version '{}' is not supported by the current runtime '{}'.",
            manifest.versions.runtime_compatibility_version.as_str(),
            current_runtime.as_str(),
        ),
        Some("runtimeCompatibilityVersion"),
    ));

    findings
}

fn derive_status(findings: &[PluginValidationFinding]) -> PluginCompatibilityStatus {
    let has_structural_or_semantic_errors = findings.iter().any(|finding| {
        finding.severity == PluginFindingSeverity::Error
            && matches!(
                finding.level,
                PluginValidationLevel::Structural | PluginValidationLevel::Semantic
            )
    });

    if has_structural_or_semantic_errors {
        return PluginCompatibilityStatus::Loadable;
    }

    let has_partial_runtime_warning = findings.iter().any(|finding| {
        finding.severity == PluginFindingSeverity::Warning
            && finding.level == PluginValidationLevel::Runtime
            && finding.code == "compatibility-layer-required"
    });

    if has_partial_runtime_warning {
        return PluginCompatibilityStatus::PartiallyCompatible;
    }

    let has_compatibility_or_runtime_errors = findings.iter().any(|finding| {
        finding.severity == PluginFindingSeverity::Error
            && matches!(
                finding.level,
                PluginValidationLevel::Compatibility | PluginValidationLevel::Runtime
            )
    });

    if has_compatibility_or_runtime_errors {
        return PluginCompatibilityStatus::Valid;
    }

    PluginCompatibilityStatus::Compatible
}

fn is_known_capability(capability: &PluginCapability) -> bool {
    matches!(
        capability.as_str().trim().to_ascii_lowercase().as_str(),
        "detect" | "parse-metadata" | "find-maps" | "validate" | "export-patch"
    )
}

fn error_finding(
    level: PluginValidationLevel,
    code: &str,
    message: String,
    field: Option<&str>,
) -> PluginValidationFinding {
    PluginValidationFinding {
        level,
        severity: PluginFindingSeverity::Error,
        code: code.to_string(),
        message,
        field: field.map(str::to_string),
    }
}

fn warning_finding(
    level: PluginValidationLevel,
    code: &str,
    message: String,
    field: Option<&str>,
) -> PluginValidationFinding {
    PluginValidationFinding {
        level,
        severity: PluginFindingSeverity::Warning,
        code: code.to_string(),
        message,
        field: field.map(str::to_string),
    }
}

#[cfg(test)]
mod tests {
    use super::{validate_plugin_manifest, PluginCompatibilityStatus};
    use crate::plugins::{
        PluginApiVersion,
        PluginCapability,
        PluginCompatibilityConstraints,
        PluginManifest,
        PluginRuntimeCompatibilityVersion,
        PluginSchemaVersion,
        PluginVersionSet,
    };

    fn valid_manifest() -> PluginManifest {
        PluginManifest {
            plugin_id: "edc16u31-detector".to_string(),
            plugin_name: "EDC16U31 Detector".to_string(),
            versions: PluginVersionSet {
                plugin_version: "1.0.0".to_string(),
                api_version: PluginApiVersion("v1".to_string()),
                schema_version: PluginSchemaVersion("v1".to_string()),
                runtime_compatibility_version: PluginRuntimeCompatibilityVersion("v1".to_string()),
            },
            supported_target_families: vec!["EDC16U31".to_string()],
            capabilities: vec![PluginCapability("detect".to_string())],
            compatibility: Some(PluginCompatibilityConstraints {
                supported_runtime_versions: vec![PluginRuntimeCompatibilityVersion("v1".to_string())],
                compatibility_layer: None,
            }),
        }
    }

    #[test]
    fn validates_compatible_manifest() {
        let report = validate_plugin_manifest(&valid_manifest());

        assert_eq!(report.status, PluginCompatibilityStatus::Compatible);
        assert!(report.findings.is_empty());
    }

    #[test]
    fn flags_missing_required_fields_as_loadable() {
        let mut manifest = valid_manifest();
        manifest.plugin_id.clear();

        let report = validate_plugin_manifest(&manifest);

        assert_eq!(report.status, PluginCompatibilityStatus::Loadable);
        assert!(report
            .findings
            .iter()
            .any(|finding| finding.code == "plugin-id-missing"));
    }

    #[test]
    fn flags_incompatible_versions_as_valid_but_not_compatible() {
        let mut manifest = valid_manifest();
        manifest.versions.api_version = PluginApiVersion("v2".to_string());
        manifest.versions.schema_version = PluginSchemaVersion("v2".to_string());
        manifest.versions.runtime_compatibility_version =
            PluginRuntimeCompatibilityVersion("v2".to_string());
        manifest.compatibility = Some(PluginCompatibilityConstraints {
            supported_runtime_versions: Vec::new(),
            compatibility_layer: None,
        });

        let report = validate_plugin_manifest(&manifest);

        assert_eq!(report.status, PluginCompatibilityStatus::Valid);
        assert!(report
            .findings
            .iter()
            .any(|finding| finding.code == "plugin-api-version-unsupported"));
        assert!(report
            .findings
            .iter()
            .any(|finding| finding.code == "plugin-runtime-version-unsupported"));
    }

    #[test]
    fn flags_invalid_capability_combination_as_loadable() {
        let mut manifest = valid_manifest();
        manifest.capabilities = vec![PluginCapability("export-patch".to_string())];

        let report = validate_plugin_manifest(&manifest);

        assert_eq!(report.status, PluginCompatibilityStatus::Loadable);
        assert!(report
            .findings
            .iter()
            .any(|finding| finding.code == "export-requires-validate"));
    }

    #[test]
    fn marks_supported_compatibility_layer_as_partial() {
        let mut manifest = valid_manifest();
        manifest.versions.runtime_compatibility_version =
            PluginRuntimeCompatibilityVersion("v2".to_string());
        manifest.compatibility = Some(PluginCompatibilityConstraints {
            supported_runtime_versions: Vec::new(),
            compatibility_layer: Some("runtime-v1-shim".to_string()),
        });

        let report = validate_plugin_manifest(&manifest);

        assert_eq!(report.status, PluginCompatibilityStatus::PartiallyCompatible);
        assert!(report
            .findings
            .iter()
            .any(|finding| finding.code == "compatibility-layer-required"));
    }
}