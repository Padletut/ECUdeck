use std::path::PathBuf;

use ecudeck_core::{validate_plugin_manifest_file, PluginCompatibilityStatus};

fn fixture_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("plugin-manifests")
        .join(name)
}

#[test]
fn validates_manifest_fixture_from_disk() {
    let report = validate_plugin_manifest_file(fixture_path("valid-edc16u31.json"));

    assert_eq!(report.status, PluginCompatibilityStatus::Compatible);
    assert_eq!(report.findings.len(), 0);
    assert_eq!(
        report.reference.as_ref().map(|reference| reference.plugin_id.as_str()),
        Some("edc16u31-detector"),
    );
}

#[test]
fn rejects_manifest_fixture_with_invalid_json() {
    let report = validate_plugin_manifest_file(fixture_path("invalid-json.json"));

    assert_eq!(report.status, PluginCompatibilityStatus::Rejected);
    assert!(report
        .findings
        .iter()
        .any(|finding| finding.code == "manifest-parse-failed"));
}

#[test]
fn rejects_missing_manifest_fixture() {
    let report = validate_plugin_manifest_file(fixture_path("missing.json"));

    assert_eq!(report.status, PluginCompatibilityStatus::Rejected);
    assert!(report
        .findings
        .iter()
        .any(|finding| finding.code == "manifest-not-found"));
}