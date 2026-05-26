use std::{
    ffi::OsStr,
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

use super::PluginValidationReport;
use crate::plugins::validate_plugin_manifest_file;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifestDiscoveryResult {
    pub directory_path: String,
    pub reports: Vec<PluginValidationReport>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PluginManifestDiscoveryError {
    DirectoryNotFound { directory_path: String },
    NotADirectory { directory_path: String },
    DirectoryUnreadable { directory_path: String, message: String },
}

impl PluginManifestDiscoveryError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::DirectoryNotFound { .. } => "plugin-directory-not-found",
            Self::NotADirectory { .. } => "plugin-directory-invalid",
            Self::DirectoryUnreadable { .. } => "plugin-directory-unreadable",
        }
    }

    pub fn message(&self) -> String {
        match self {
            Self::DirectoryNotFound { directory_path } => {
                format!("Plugin directory '{}' was not found.", directory_path)
            }
            Self::NotADirectory { directory_path } => {
                format!("Plugin path '{}' is not a directory.", directory_path)
            }
            Self::DirectoryUnreadable {
                directory_path,
                message,
            } => format!("Plugin directory '{}' could not be read: {}", directory_path, message),
        }
    }
}

pub fn discover_plugin_manifests(
    directory_path: impl AsRef<Path>,
) -> Result<PluginManifestDiscoveryResult, PluginManifestDiscoveryError> {
    let directory_path = directory_path.as_ref();
    let display_path = directory_path.display().to_string();

    let metadata = fs::metadata(directory_path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            PluginManifestDiscoveryError::DirectoryNotFound {
                directory_path: display_path.clone(),
            }
        } else {
            PluginManifestDiscoveryError::DirectoryUnreadable {
                directory_path: display_path.clone(),
                message: error.to_string(),
            }
        }
    })?;

    if !metadata.is_dir() {
        return Err(PluginManifestDiscoveryError::NotADirectory {
            directory_path: display_path,
        });
    }

    let mut manifest_paths = Vec::new();
    collect_json_files(directory_path, &mut manifest_paths)?;
    manifest_paths.sort();

    Ok(PluginManifestDiscoveryResult {
        directory_path: directory_path.display().to_string(),
        reports: manifest_paths
            .into_iter()
            .map(validate_plugin_manifest_file)
            .collect(),
    })
}

fn collect_json_files(
    directory_path: &Path,
    manifest_paths: &mut Vec<PathBuf>,
) -> Result<(), PluginManifestDiscoveryError> {
    let entries = fs::read_dir(directory_path).map_err(|error| {
        PluginManifestDiscoveryError::DirectoryUnreadable {
            directory_path: directory_path.display().to_string(),
            message: error.to_string(),
        }
    })?;

    for entry in entries {
        let entry = entry.map_err(|error| PluginManifestDiscoveryError::DirectoryUnreadable {
            directory_path: directory_path.display().to_string(),
            message: error.to_string(),
        })?;

        let file_type = entry.file_type().map_err(|error| {
            PluginManifestDiscoveryError::DirectoryUnreadable {
                directory_path: directory_path.display().to_string(),
                message: error.to_string(),
            }
        })?;
        let entry_path = entry.path();

        if file_type.is_dir() {
            collect_json_files(&entry_path, manifest_paths)?;
            continue;
        }

        if file_type.is_file() && entry_path.extension() == Some(OsStr::new("json")) {
            manifest_paths.push(entry_path);
        }
    }

    Ok(())
}