use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub plugin_id: String,
    pub plugin_name: String,
    #[serde(flatten)]
    pub versions: PluginVersionSet,
    pub supported_target_families: Vec<String>,
    pub capabilities: Vec<PluginCapability>,
    pub compatibility: Option<PluginCompatibilityConstraints>,
}

impl PluginManifest {
    pub fn reference_metadata(&self) -> PluginReferenceMetadata {
        PluginReferenceMetadata {
            plugin_id: self.plugin_id.clone(),
            plugin_name: self.plugin_name.clone(),
            versions: self.versions.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PluginVersionSet {
    pub plugin_version: String,
    pub api_version: PluginApiVersion,
    pub schema_version: PluginSchemaVersion,
    pub runtime_compatibility_version: PluginRuntimeCompatibilityVersion,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PluginCompatibilityConstraints {
    #[serde(default)]
    pub supported_runtime_versions: Vec<PluginRuntimeCompatibilityVersion>,
    pub compatibility_layer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PluginReferenceMetadata {
    pub plugin_id: String,
    pub plugin_name: String,
    #[serde(flatten)]
    pub versions: PluginVersionSet,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(transparent)]
pub struct PluginCapability(pub String);

impl PluginCapability {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(transparent)]
pub struct PluginApiVersion(pub String);

impl PluginApiVersion {
    pub fn current() -> Self {
        Self("v1".to_string())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(transparent)]
pub struct PluginSchemaVersion(pub String);

impl PluginSchemaVersion {
    pub fn current() -> Self {
        Self("v1".to_string())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(transparent)]
pub struct PluginRuntimeCompatibilityVersion(pub String);

impl PluginRuntimeCompatibilityVersion {
    pub fn current() -> Self {
        Self("v1".to_string())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}