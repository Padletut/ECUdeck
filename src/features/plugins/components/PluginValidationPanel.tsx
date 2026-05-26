import type {
  PluginManifestDiscoveryResult,
  PluginCompatibilityStatus,
  PluginValidationFinding,
  PluginValidationReport,
} from '../../../shared/types/plugins';
import { usePluginManifestValidation } from '../hooks/usePluginManifestValidation';

export default function PluginValidationPanel() {
  const {
    pluginDirectoryPath,
    manifestPath,
    discovery,
    report,
    errorMessage,
    isDiscovering,
    isValidating,
    canDiscover,
    canValidate,
    setPluginDirectoryPath,
    setManifestPath,
    discoverManifests,
    selectManifestReport,
    validateManifest,
  } = usePluginManifestValidation();

  const handleDiscover = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await discoverManifests();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await validateManifest();
  };

  return (
    <section className="overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
      <div className="flex items-center justify-between border-b border-gridlines-grey px-6 py-4">
        <div>
          <h2 className="text-section-title font-bold">Plugin Runtime Validation</h2>
          <p className="mt-1 text-sm text-alloy-silver">
            Validate a plugin manifest through the new Rust core contract.
          </p>
        </div>
        <span className="rounded-full border border-electric-blue/50 bg-electric-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-electric-blue">
          Phase 1
        </span>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <form className="space-y-5" onSubmit={handleDiscover}>
            <div>
              <label
                htmlFor="plugin-directory-path"
                className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver"
              >
                Plugin Directory
              </label>
              <input
                id="plugin-directory-path"
                value={pluginDirectoryPath}
                onChange={(event) => setPluginDirectoryPath(event.target.value)}
                placeholder="/absolute/path/to/plugin-directory"
                className="w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 font-mono text-sm text-soft-white outline-none transition focus:border-electric-blue"
                spellCheck={false}
                autoComplete="off"
              />
              <p className="mt-2 text-sm text-muted-text">
                The Rust core scans this directory recursively for JSON manifests and returns a
                stable, prevalidated list.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={!canDiscover}
                className="rounded-lg border border-electric-blue px-5 py-3 font-semibold text-electric-blue transition hover:bg-electric-blue hover:text-carbon-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDiscovering ? 'Scanning...' : 'Discover Manifests'}
              </button>
              {errorMessage ? <p className="text-sm text-fail-red">{errorMessage}</p> : null}
            </div>
          </form>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="plugin-manifest-path"
                className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver"
              >
                Manifest Path
              </label>
              <input
                id="plugin-manifest-path"
                value={manifestPath}
                onChange={(event) => setManifestPath(event.target.value)}
                placeholder="/absolute/path/to/metadata.json"
                className="w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 font-mono text-sm text-soft-white outline-none transition focus:border-electric-blue"
                spellCheck={false}
                autoComplete="off"
              />
              <p className="mt-2 text-sm text-muted-text">
                You can still validate a specific manifest directly. Selecting a discovered entry
                below will preload the same report here.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={!canValidate}
                className="rounded-lg bg-electric-blue px-5 py-3 font-semibold text-carbon-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isValidating ? 'Validating...' : 'Validate Manifest'}
              </button>
            </div>
          </form>

          <DiscoveredManifestList
            discovery={discovery}
            activeManifestPath={manifestPath}
            onSelectReport={selectManifestReport}
          />
        </div>

        <div className="rounded-lg border border-gridlines-grey bg-carbon-black/50 p-5">
          {report ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-muted-text">Result</p>
                  <h3 className="mt-2 text-xl font-bold text-soft-white">
                    {report.reference?.pluginName ?? 'Unknown Plugin'}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-alloy-silver">
                    {report.reference?.pluginId ?? 'No pluginId'}
                  </p>
                </div>
                <span className={statusBadgeClassName(report.status)}>{report.status}</span>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoField label="Plugin Version" value={report.reference?.pluginVersion ?? '-'} />
                <InfoField label="API Version" value={report.reference?.apiVersion ?? '-'} />
                <InfoField label="Schema Version" value={report.reference?.schemaVersion ?? '-'} />
                <InfoField
                  label="Runtime Version"
                  value={report.reference?.runtimeCompatibilityVersion ?? '-'}
                />
              </dl>

              <div>
                <p className="mb-3 text-sm uppercase tracking-[0.22em] text-muted-text">Findings</p>
                {report.findings.length > 0 ? (
                  <ul className="space-y-3">
                    {report.findings.map((finding) => (
                      <li
                        key={`${finding.level}-${finding.code}`}
                        className="rounded-lg border border-gridlines-grey bg-steel-grey-alt/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-soft-white">{finding.message}</p>
                            <p className="mt-2 font-mono text-xs text-muted-text">{finding.code}</p>
                          </div>
                          <span className={findingBadgeClassName(finding)}>{finding.severity}</span>
                        </div>
                        <p className="mt-3 text-sm text-alloy-silver">
                          {finding.level}
                          {finding.field ? ` · ${finding.field}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-lg border border-dyno-green/40 bg-dyno-green/10 px-4 py-3 text-sm text-dyno-green">
                    No findings. The manifest is fully compatible with the current phase-1 runtime.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-64 flex-col justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-muted-text">
                  Awaiting Input
                </p>
                <h3 className="mt-2 text-xl font-bold text-soft-white">
                  No manifest validated yet
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-alloy-silver">
                  Provide a manifest path to exercise the Rust core validation boundary and inspect
                  the structured compatibility report returned by Tauri.
                </p>
              </div>

              <div className="mt-8 rounded-lg border border-gridlines-grey bg-carbon-black/60 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                  Expected Inputs
                </p>
                <p className="mt-3 font-mono text-xs leading-6 text-muted-text">
                  pluginId, pluginName, pluginVersion, apiVersion, schemaVersion,
                  runtimeCompatibilityVersion, supportedTargetFamilies, capabilities
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DiscoveredManifestList({
  discovery,
  activeManifestPath,
  onSelectReport,
}: Readonly<{
  discovery: PluginManifestDiscoveryResult | null;
  activeManifestPath: string;
  onSelectReport: (report: PluginValidationReport) => void;
}>) {
  if (!discovery) {
    return (
      <div className="rounded-lg border border-gridlines-grey bg-carbon-black/40 p-5">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-text">Discovery Queue</p>
        <p className="mt-3 text-sm leading-6 text-alloy-silver">
          Scan a plugin directory to inspect discovered manifests and load a report directly into
          the validation panel.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gridlines-grey bg-carbon-black/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted-text">
            Discovered Manifests
          </p>
          <p className="mt-2 text-sm leading-6 text-alloy-silver">{discovery.directoryPath}</p>
        </div>
        <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver">
          {discovery.reports.length} found
        </span>
      </div>

      {discovery.reports.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {discovery.reports.map((item) => {
            const itemPath = item.manifestPath ?? '';
            const isActive = itemPath === activeManifestPath;

            return (
              <li
                key={itemPath || `${item.status}-${item.reference?.pluginId ?? 'unknown'}`}
                className="rounded-lg border border-gridlines-grey bg-steel-grey-alt/50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-soft-white">
                      {item.reference?.pluginName ?? fileNameFromPath(item.manifestPath)}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-muted-text">
                      {itemPath || 'No manifest path available'}
                    </p>
                  </div>
                  <span className={statusBadgeClassName(item.status)}>{item.status}</span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-sm text-alloy-silver">
                    {item.reference?.pluginId ?? 'Unreadable manifest'}
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectReport(item)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'border border-dyno-green bg-dyno-green/10 text-dyno-green'
                        : 'border border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-carbon-black'
                    }`}
                  >
                    {isActive ? 'Loaded' : 'Load Report'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-5 rounded-lg border border-gridlines-grey bg-steel-grey-alt/30 px-4 py-3 text-sm text-alloy-silver">
          No JSON manifests were found in this directory.
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-gridlines-grey bg-carbon-black/60 px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.2em] text-muted-text">{label}</dt>
      <dd className="mt-2 font-mono text-sm text-soft-white">{value}</dd>
    </div>
  );
}

function statusBadgeClassName(status: PluginCompatibilityStatus): string {
  switch (status) {
    case 'compatible':
      return 'rounded-full border border-dyno-green/50 bg-dyno-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-dyno-green';
    case 'partially-compatible':
      return 'rounded-full border border-alert-amber/50 bg-alert-amber/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alert-amber';
    case 'valid':
    case 'loadable':
      return 'rounded-full border border-electric-blue/50 bg-electric-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-electric-blue';
    case 'rejected':
      return 'rounded-full border border-fail-red/50 bg-fail-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-fail-red';
  }
}

function findingBadgeClassName(finding: PluginValidationFinding): string {
  const tone =
    finding.severity === 'error'
      ? 'border-fail-red/50 bg-fail-red/10 text-fail-red'
      : 'border-alert-amber/50 bg-alert-amber/10 text-alert-amber';

  return `rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone}`;
}

function fileNameFromPath(path?: string): string {
  if (!path) {
    return 'Unknown Manifest';
  }

  const segments = path.split(/[\\/]/);
  return segments[segments.length - 1] || path;
}
