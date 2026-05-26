use std::path::PathBuf;

use ecudeck_core::{
    discover_plugin_manifests,
    PluginCompatibilityStatus,
    PluginManifestDiscoveryError,
};

fn fixture_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("plugin-manifests")
        .join(name)
}

#[test]
fn discovers_json_manifests_recursively_in_stable_order() {
    let result = discover_plugin_manifests(fixture_path("")).expect("fixtures directory should scan");

    assert_eq!(result.reports.len(), 3);
    assert_eq!(
        result
            .reports
            .iter()
            .map(|report| {
                report
                    .manifest_path
                    .as_deref()
                    .and_then(|path| path.rsplit('/').next())
                    .unwrap_or_default()
                    .to_string()
            })
            .collect::<Vec<_>>(),
        vec![
            "invalid-json.json".to_string(),
            "runtime-shim.json".to_string(),
            "valid-edc16u31.json".to_string(),
        ],
    );
    assert_eq!(
        result
            .reports
            .iter()
            .filter_map(|report| report.reference.as_ref().map(|reference| reference.plugin_id.as_str()))
            .collect::<Vec<_>>(),
        vec!["nested-shim-plugin", "edc16u31-detector"],
    );
    assert_eq!(result.reports[0].status, PluginCompatibilityStatus::Rejected);
    assert_eq!(result.reports[1].status, PluginCompatibilityStatus::PartiallyCompatible);
    assert_eq!(result.reports[2].status, PluginCompatibilityStatus::Compatible);
}

#[test]
fn rejects_missing_plugin_directory() {
    let result = discover_plugin_manifests(fixture_path("missing-directory"));

    assert_eq!(
        result,
        Err(PluginManifestDiscoveryError::DirectoryNotFound {
            directory_path: fixture_path("missing-directory").display().to_string(),
        }),
    );
}

#[test]
fn rejects_non_directory_paths() {
    let result = discover_plugin_manifests(fixture_path("valid-edc16u31.json"));

    assert_eq!(
        result,
        Err(PluginManifestDiscoveryError::NotADirectory {
            directory_path: fixture_path("valid-edc16u31.json").display().to_string(),
        }),
    );
}