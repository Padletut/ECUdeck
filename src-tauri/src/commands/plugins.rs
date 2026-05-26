use crate::plugin_contracts::{
    DiscoverPluginManifestsRequest,
    DiscoverPluginManifestsResponse,
    PluginCommandError,
    ValidatePluginManifestRequest,
    ValidatePluginManifestResponse,
};

#[tauri::command]
pub fn discover_plugin_manifests(
    request: DiscoverPluginManifestsRequest,
) -> Result<DiscoverPluginManifestsResponse, PluginCommandError> {
    if request.directory_path.trim().is_empty() {
        return Err(PluginCommandError {
            code: "invalid-plugin-directory".to_string(),
            message: "directoryPath must be a non-empty path string.".to_string(),
        });
    }

    let discovery = ecudeck_core::discover_plugin_manifests(&request.directory_path).map_err(
        |error| PluginCommandError {
            code: error.code().to_string(),
            message: error.message(),
        },
    )?;

    Ok(DiscoverPluginManifestsResponse { discovery })
}

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