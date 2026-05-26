import type { AiRequestOwnership } from './aiContext';

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

export type PluginReferenceOwnership = Pick<
  AiRequestOwnership,
  'workspaceId' | 'projectId' | 'sessionId'
>;

export type PluginReferenceCaptureMode = 'generated' | 'inferred' | 'manually-adjusted';

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

export interface PersistedPluginReference {
  id: string;
  manifestPath?: string;
  directoryPath?: string;
  captureMode: PluginReferenceCaptureMode;
  capturedAt: string;
  report: PluginValidationReport;
}

export interface PersistedPluginReferenceState {
  ownership: PluginReferenceOwnership;
  pluginDirectoryPath?: string;
  manifestPath?: string;
  activePluginReferenceId?: string;
  pluginReferences: PersistedPluginReference[];
}

export interface PluginValidationScopeState {
  ownership: PluginReferenceOwnership;
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
