export type PluginCompatibilityStatus =
  | 'loadable'
  | 'valid'
  | 'compatible'
  | 'partially-compatible'
  | 'rejected';

export type PluginValidationLevel = 'structural' | 'compatibility' | 'semantic' | 'runtime';

export type PluginFindingSeverity = 'error' | 'warning';

export type PluginCapability = string;

export interface PluginCompatibilityConstraints {
  supportedRuntimeVersions: string[];
  compatibilityLayer?: string;
}

export interface PluginVersionFields {
  pluginVersion: string;
  apiVersion: string;
  schemaVersion: string;
  runtimeCompatibilityVersion: string;
}

export interface PluginReferenceMetadata extends PluginVersionFields {
  pluginId: string;
  pluginName: string;
}

export interface PluginManifest extends PluginVersionFields {
  pluginId: string;
  pluginName: string;
  supportedTargetFamilies: string[];
  capabilities: PluginCapability[];
  compatibility?: PluginCompatibilityConstraints;
}

export interface PluginValidationFinding {
  level: PluginValidationLevel;
  severity: PluginFindingSeverity;
  code: string;
  message: string;
  field?: string;
}

export interface PluginValidationReport {
  status: PluginCompatibilityStatus;
  manifestPath?: string;
  reference?: PluginReferenceMetadata;
  findings: PluginValidationFinding[];
}

export interface PluginManifestDiscoveryResult {
  directoryPath: string;
  reports: PluginValidationReport[];
}

export interface DiscoverPluginManifestsRequest {
  directoryPath: string;
}

export interface DiscoverPluginManifestsResponse {
  discovery: PluginManifestDiscoveryResult;
}

export interface ValidatePluginManifestRequest {
  manifestPath: string;
}

export interface ValidatePluginManifestResponse {
  report: PluginValidationReport;
}

export interface PluginCommandError {
  code: string;
  message: string;
}
