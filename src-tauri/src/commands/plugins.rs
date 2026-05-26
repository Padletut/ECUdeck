use crate::plugin_contracts::{
    PluginCommandError,
    ValidatePluginManifestRequest,
    ValidatePluginManifestResponse,
};

#[tauri::command]
pub fn validate_plugin_manifest(
    request: ValidatePluginManifestRequest,
) -> Result<ValidatePluginManifestResponse, PluginCommandError> {
    if request.manifest_path.trim().is_empty() {
        return Err(PluginCommandError {
            code: "invalid-manifest-path".to_string(),
            message: "manifestPath must be a non-empty path string.".to_string(),
        });
    }

    Ok(ValidatePluginManifestResponse {
        report: ecudeck_core::validate_plugin_manifest_file(&request.manifest_path),
    })
}