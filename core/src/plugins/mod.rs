mod discovery;
mod manifest;
mod validation;

pub use discovery::{
    discover_plugin_manifests,
    PluginManifestDiscoveryError,
    PluginManifestDiscoveryResult,
};
pub use manifest::{
    PluginApiVersion,
    PluginCapability,
    PluginCompatibilityConstraints,
    PluginManifest,
    PluginReferenceMetadata,
    PluginRuntimeCompatibilityVersion,
    PluginSchemaVersion,
    PluginVersionSet,
};
pub use validation::{
    validate_plugin_manifest,
    validate_plugin_manifest_file,
    PluginCompatibilityStatus,
    PluginFindingSeverity,
    PluginValidationFinding,
    PluginValidationLevel,
    PluginValidationReport,
};