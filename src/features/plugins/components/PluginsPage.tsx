import { useMemo, useRef, useState } from 'react';

import { useWorkspaceFirmware } from '../../../app/providers/WorkspaceScopeProvider';
import { pluginLibraryStore } from '../../../services/storage/pluginLibraryStore';
import type {
  PersistedPluginLibraryEntry,
  PluginLibrarySource,
  PluginManifest,
} from '../../../shared/types/plugins';
import PluginEditor from './PluginEditor';

interface PluginsPageProps {
  onNavigateToDashboard: () => void;
  onOpenMapEditorFromPlugins: () => void;
}

type LibraryMessageTone = 'success' | 'error' | 'info';

interface LibraryMessage {
  tone: LibraryMessageTone;
  text: string;
}

const DEFAULT_PLUGIN_LIBRARY: PersistedPluginLibraryEntry[] = [
  createLibraryEntry(
    {
      pluginId: 'edc16u31-detector',
      pluginName: 'EDC16U31 Detector',
      pluginVersion: '1.0.0',
      apiVersion: 'v1',
      schemaVersion: 'v1',
      runtimeCompatibilityVersion: 'v1',
      supportedTargetFamilies: ['EDC16U31'],
      capabilities: ['detect', 'map-discovery'],
      compatibility: {
        supportedRuntimeVersions: ['v1'],
      },
    },
    'built-in',
    'edc16u31-detector.json',
    '2026-05-27T00:00:00.000Z',
  ),
  createLibraryEntry(
    {
      pluginId: 'bosch-me7-map-pack',
      pluginName: 'Bosch ME7 Map Pack',
      pluginVersion: '0.9.2',
      apiVersion: 'v1',
      schemaVersion: 'v1',
      runtimeCompatibilityVersion: 'v1',
      supportedTargetFamilies: ['ME7', 'ME7.5'],
      capabilities: ['detect', 'single-values', 'map-preview'],
      compatibility: {
        supportedRuntimeVersions: ['v1'],
      },
    },
    'built-in',
    'bosch-me7-map-pack.json',
    '2026-05-26T00:00:00.000Z',
  ),
  createLibraryEntry(
    {
      pluginId: 'checksum-safety-rules',
      pluginName: 'Checksum Safety Rules',
      pluginVersion: '0.4.0',
      apiVersion: 'v1',
      schemaVersion: 'v1',
      runtimeCompatibilityVersion: 'v1',
      supportedTargetFamilies: ['Generic Bosch', 'Generic Siemens'],
      capabilities: ['checksums', 'export-guardrails'],
      compatibility: {
        supportedRuntimeVersions: ['v1'],
      },
    },
    'built-in',
    'checksum-safety-rules.json',
    '2026-05-25T00:00:00.000Z',
  ),
];

export default function PluginsPage({
  onNavigateToDashboard,
  onOpenMapEditorFromPlugins,
}: Readonly<PluginsPageProps>) {
  const {
    mapData,
    lastLoadedFirmware,
    loading,
    loadingMessage,
    loadingProgress,
    hasLoadedFirmware,
  } = useWorkspaceFirmware();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [pluginEntries, setPluginEntries] = useState<PersistedPluginLibraryEntry[]>(() =>
    pluginLibraryStore.loadEntries(DEFAULT_PLUGIN_LIBRARY),
  );
  const [activePluginId, setActivePluginId] = useState<string | null>(pluginEntries[0]?.id ?? null);
  const [showPluginEditor, setShowPluginEditor] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState<LibraryMessage | null>({
    tone: 'info',
    text: 'Plugins are global. Import, export, and manage the library here, then open the editor against the current loaded firmware when needed.',
  });

  const activePlugin = useMemo(
    () => pluginEntries.find((entry) => entry.id === activePluginId) ?? pluginEntries[0] ?? null,
    [activePluginId, pluginEntries],
  );

  const persistEntries = (nextEntries: PersistedPluginLibraryEntry[]) => {
    pluginLibraryStore.saveEntries(nextEntries);
    setPluginEntries(nextEntries);

    if (!nextEntries.some((entry) => entry.id === activePluginId)) {
      setActivePluginId(nextEntries[0]?.id ?? null);
    }
  };

  const handleOpenPluginEditor = (entry: PersistedPluginLibraryEntry) => {
    setActivePluginId(entry.id);

    if (hasLoadedFirmware && mapData) {
      setShowPluginEditor(true);
      return;
    }

    if (lastLoadedFirmware) {
      setLibraryMessage({
        tone: 'error',
        text: `Firmware summary for ${lastLoadedFirmware.fileName} is available, but the binary is not loaded in memory. Reload firmware from Dashboard before opening the editor.`,
      });
      return;
    }

    setLibraryMessage({
      tone: 'error',
      text: 'Load firmware from Dashboard before opening the Plugin Editor. The plugin library itself stays available globally.',
    });
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportPlugins = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const importedEntries: PersistedPluginLibraryEntry[] = [];
    const failures: string[] = [];

    for (const file of files) {
      try {
        const contents = await file.text();
        const parsedContents = JSON.parse(contents) as unknown;
        const manifest = parsePluginManifest(parsedContents);

        importedEntries.push(
          createLibraryEntry(manifest, 'imported', file.name, new Date().toISOString()),
        );
      } catch (error) {
        failures.push(`${file.name}: ${getErrorMessage(error)}`);
      }
    }

    if (importedEntries.length > 0) {
      const nextEntries = mergePluginEntries(pluginEntries, importedEntries);
      persistEntries(nextEntries);
      setActivePluginId(importedEntries[0]?.id ?? activePluginId);
    }

    if (importedEntries.length > 0 && failures.length === 0) {
      setLibraryMessage({
        tone: 'success',
        text: `Imported ${importedEntries.length} plugin${importedEntries.length === 1 ? '' : 's'} into the global library.`,
      });
    } else if (importedEntries.length > 0) {
      setLibraryMessage({
        tone: 'info',
        text: `Imported ${importedEntries.length} plugin${importedEntries.length === 1 ? '' : 's'}, but ${failures.length} file${failures.length === 1 ? '' : 's'} failed: ${failures.join(' | ')}`,
      });
    } else {
      setLibraryMessage({
        tone: 'error',
        text: failures.join(' | '),
      });
    }

    event.target.value = '';
  };

  const handleExportPlugin = (entry: PersistedPluginLibraryEntry) => {
    downloadJsonFile(entry.manifest, buildManifestFileName(entry));
    setActivePluginId(entry.id);
    setLibraryMessage({
      tone: 'success',
      text: `Exported ${entry.manifest.pluginName}.`,
    });
  };

  const handleExportAll = () => {
    downloadJsonFile(
      pluginEntries.map((entry) => entry.manifest),
      'ecudeck-plugin-library.json',
    );
    setLibraryMessage({
      tone: 'success',
      text: `Exported ${pluginEntries.length} plugin${pluginEntries.length === 1 ? '' : 's'} from the global library.`,
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon-black/90">
        <div className="mx-4 w-full max-w-md rounded-xl border border-electric-blue bg-steel-grey p-8">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 animate-spin text-electric-blue"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-xl font-bold text-soft-white">Loading ECU Data</h3>
            <p className="mb-4 text-alloy-silver">{loadingMessage}</p>

            <div className="mb-4 h-2 w-full rounded-full bg-gridlines-grey">
              <div
                className="h-2 rounded-full bg-electric-blue transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            <p className="text-sm text-alloy-silver">{loadingProgress}% complete</p>
          </div>
        </div>
      </div>
    );
  }

  if (showPluginEditor && mapData) {
    return (
      <PluginEditor
        mapData={mapData}
        activePluginName={activePlugin?.manifest.pluginName}
        backLabel="Back to Plugins"
        onBack={() => {
          setShowPluginEditor(false);
        }}
        onReturnToMapEditor={() => {
          setShowPluginEditor(false);
          onOpenMapEditorFromPlugins();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-xl border border-gridlines-grey bg-steel-grey">
        <div className="flex flex-wrap items-start justify-between gap-6 px-6 py-6">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-muted-text">Plugins</p>
            <h1 className="mt-2 text-page-headline font-bold">Global Plugin Library</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-alloy-silver">
              Plugins live globally here. Import manifests, export plugins, review what is in the
              library, and open the Plugin Editor from a plugin row when you want to work against
              live firmware.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleImportClick}
              className="rounded-lg border border-electric-blue px-5 py-3 text-sm font-semibold text-electric-blue transition hover:bg-electric-blue hover:text-carbon-black"
            >
              Import Plugins
            </button>
            <button
              type="button"
              onClick={handleExportAll}
              className="rounded-lg border border-gridlines-grey px-5 py-3 text-sm font-semibold text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
            >
              Export All
            </button>
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="rounded-lg border border-gridlines-grey px-5 py-3 text-sm font-semibold text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
            >
              Go to Dashboard
            </button>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            onChange={handleImportPlugins}
            className="hidden"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-hidden rounded-xl border border-gridlines-grey bg-steel-grey">
          <div className="border-b border-gridlines-grey px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-section-title font-bold">Plugin List</h2>
                <p className="mt-1 text-sm text-alloy-silver">
                  Global table of plugins available to ECUDeck.
                </p>
              </div>
              <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                {pluginEntries.length} plugins
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gridlines-grey bg-carbon-black/35 text-xs uppercase tracking-[0.18em] text-muted-text">
                  <th className="px-6 py-4 font-semibold">Plugin</th>
                  <th className="px-6 py-4 font-semibold">Version</th>
                  <th className="px-6 py-4 font-semibold">Families</th>
                  <th className="px-6 py-4 font-semibold">Capabilities</th>
                  <th className="px-6 py-4 font-semibold">Source</th>
                  <th className="px-6 py-4 font-semibold">Updated</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pluginEntries.map((entry) => {
                  const isActive = entry.id === activePlugin?.id;

                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-gridlines-grey/70 transition ${
                        isActive ? 'bg-electric-blue/5' : 'bg-steel-grey'
                      }`}
                    >
                      <td className="px-6 py-4 align-top">
                        <button
                          type="button"
                          onClick={() => setActivePluginId(entry.id)}
                          className="text-left"
                        >
                          <p className="font-semibold text-soft-white">
                            {entry.manifest.pluginName}
                          </p>
                          <p className="mt-1 font-mono text-xs text-alloy-silver">
                            {entry.manifest.pluginId}
                          </p>
                        </button>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm text-soft-white">{entry.manifest.pluginVersion}</p>
                        <p className="mt-1 text-xs text-alloy-silver">
                          API {entry.manifest.apiVersion} · Schema {entry.manifest.schemaVersion}
                        </p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm leading-6 text-soft-white">
                          {entry.manifest.supportedTargetFamilies.join(', ')}
                        </p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {entry.manifest.capabilities.map((capability) => (
                            <span
                              key={capability}
                              className="rounded-full border border-gridlines-grey bg-carbon-black/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver"
                            >
                              {capability}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={sourcePillClassName(entry.source)}>
                          {formatSourceLabel(entry.source)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm text-soft-white">{formatDate(entry.updatedAt)}</p>
                        <p className="mt-1 text-xs text-alloy-silver">
                          {entry.fileName ?? buildManifestFileName(entry)}
                        </p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPluginEditor(entry)}
                            disabled={!hasLoadedFirmware}
                            className="rounded-lg border border-electric-blue px-4 py-2 text-sm font-semibold text-electric-blue transition hover:bg-electric-blue hover:text-carbon-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Open Editor
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportPlugin(entry)}
                            className="rounded-lg border border-gridlines-grey px-4 py-2 text-sm font-semibold text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
                          >
                            Export
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-gridlines-grey bg-steel-grey">
            <div className="border-b border-gridlines-grey px-5 py-4">
              <h2 className="text-section-title font-bold">Editor Readiness</h2>
              <p className="mt-1 text-sm text-alloy-silver">
                The library is global. Editor actions still use the currently loaded firmware.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <InfoRow
                label="Active Plugin"
                value={activePlugin?.manifest.pluginName ?? 'None selected'}
              />
              <InfoRow
                label="Firmware"
                value={lastLoadedFirmware?.fileName ?? 'No firmware loaded'}
              />
              <StatusPill active={hasLoadedFirmware}>
                {hasLoadedFirmware ? 'Editor Ready' : 'Library Only'}
              </StatusPill>
            </div>
          </section>

          {libraryMessage ? (
            <section className={messageClassName(libraryMessage.tone)}>
              {libraryMessage.text}
            </section>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-gridlines-grey bg-carbon-black/35 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-text">{label}</p>
      <p className="mt-2 text-sm text-soft-white">{value}</p>
    </div>
  );
}

function StatusPill({
  active,
  children,
}: Readonly<{
  active: boolean;
  children: string;
}>) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        active
          ? 'border border-electric-blue/50 bg-electric-blue/10 text-electric-blue'
          : 'border border-gridlines-grey text-alloy-silver'
      }`}
    >
      {children}
    </span>
  );
}

function createLibraryEntry(
  manifest: PluginManifest,
  source: PluginLibrarySource,
  fileName?: string,
  updatedAt: string = new Date().toISOString(),
): PersistedPluginLibraryEntry {
  return {
    id: buildEntryId(manifest),
    manifest,
    source,
    fileName,
    updatedAt,
  };
}

function buildEntryId(manifest: PluginManifest): string {
  return `${manifest.pluginId}::${manifest.pluginVersion}`;
}

function buildManifestFileName(entry: PersistedPluginLibraryEntry): string {
  if (entry.fileName) {
    return entry.fileName;
  }

  return `${entry.manifest.pluginId}.json`;
}

function mergePluginEntries(
  existingEntries: PersistedPluginLibraryEntry[],
  importedEntries: PersistedPluginLibraryEntry[],
): PersistedPluginLibraryEntry[] {
  const entryMap = new Map(existingEntries.map((entry) => [entry.id, entry]));

  for (const entry of importedEntries) {
    entryMap.set(entry.id, entry);
  }

  return Array.from(entryMap.values()).sort((left, right) =>
    left.manifest.pluginName.localeCompare(right.manifest.pluginName),
  );
}

function parsePluginManifest(value: unknown): PluginManifest {
  if (!value || typeof value !== 'object') {
    throw new Error('Plugin file must contain a JSON object.');
  }

  const manifest = value as Record<string, unknown>;
  const pluginId = readRequiredString(manifest.pluginId, 'pluginId');
  const pluginName = readRequiredString(manifest.pluginName, 'pluginName');
  const pluginVersion = readRequiredString(manifest.pluginVersion, 'pluginVersion');
  const apiVersion = readRequiredString(manifest.apiVersion, 'apiVersion');
  const schemaVersion = readRequiredString(manifest.schemaVersion, 'schemaVersion');
  const runtimeCompatibilityVersion = readRequiredString(
    manifest.runtimeCompatibilityVersion,
    'runtimeCompatibilityVersion',
  );
  const supportedTargetFamilies = readStringArray(
    manifest.supportedTargetFamilies,
    'supportedTargetFamilies',
  );
  const capabilities = readStringArray(manifest.capabilities, 'capabilities');
  const compatibility = parseCompatibility(manifest.compatibility);

  return {
    pluginId,
    pluginName,
    pluginVersion,
    apiVersion,
    schemaVersion,
    runtimeCompatibilityVersion,
    supportedTargetFamilies,
    capabilities,
    compatibility,
  };
}

function parseCompatibility(value: unknown): PluginManifest['compatibility'] {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== 'object') {
    throw new Error('compatibility must be an object when provided.');
  }

  const compatibility = value as Record<string, unknown>;

  return {
    supportedRuntimeVersions: readStringArray(
      compatibility.supportedRuntimeVersions,
      'compatibility.supportedRuntimeVersions',
    ),
    compatibilityLayer:
      compatibility.compatibilityLayer === undefined
        ? undefined
        : readRequiredString(compatibility.compatibilityLayer, 'compatibility.compatibilityLayer'),
  };
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function readStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string array.`);
  }

  const normalizedValues = value.map((item) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(`${fieldName} must only contain non-empty strings.`);
    }

    return item.trim();
  });

  return normalizedValues;
}

function downloadJsonFile(value: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function formatSourceLabel(source: PluginLibrarySource): string {
  switch (source) {
    case 'built-in':
      return 'Built-In';
    case 'created':
      return 'Created';
    case 'imported':
    default:
      return 'Imported';
  }
}

function sourcePillClassName(source: PluginLibrarySource): string {
  switch (source) {
    case 'built-in':
      return 'rounded-full border border-electric-blue/50 bg-electric-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-electric-blue';
    case 'created':
      return 'rounded-full border border-dyno-green/50 bg-dyno-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-dyno-green';
    case 'imported':
    default:
      return 'rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-alloy-silver';
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function messageClassName(tone: LibraryMessageTone): string {
  switch (tone) {
    case 'success':
      return 'rounded-xl border border-dyno-green/40 bg-dyno-green/10 px-5 py-4 text-sm leading-6 text-dyno-green';
    case 'error':
      return 'rounded-xl border border-fail-red/40 bg-fail-red/10 px-5 py-4 text-sm leading-6 text-fail-red';
    case 'info':
    default:
      return 'rounded-xl border border-gridlines-grey bg-steel-grey px-5 py-4 text-sm leading-6 text-alloy-silver';
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown import error.';
}
