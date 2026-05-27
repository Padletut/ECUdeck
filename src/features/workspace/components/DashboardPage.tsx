import { useRef } from 'react';

import { useWorkspaceFirmware } from '../../../app/providers/WorkspaceScopeProvider';
import MapEditorTabs from '../../map-editor/components/MapEditorTabs';

interface DashboardPageProps {
  onOpenPluginsPage: () => void;
}

export default function DashboardPage({ onOpenPluginsPage }: Readonly<DashboardPageProps>) {
  const {
    showMapEditor,
    mapData,
    lastLoadedFirmware,
    loading,
    loadingProgress,
    loadingMessage,
    hasLoadedFirmware,
    loadFirmwareFile,
    openMapEditor,
    closeMapEditor,
  } = useWorkspaceFirmware();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      await loadFirmwareFile(file);
    } catch (error) {
      console.error('Error reading file:', error);
    }

    event.target.value = '';
  };

  const handleBrowseClick = async () => {
    if (hasLoadedFirmware) {
      openMapEditor();
      return;
    }

    if (lastLoadedFirmware) {
      alert(
        `Last loaded firmware metadata is available for ${lastLoadedFirmware.fileName}, but the binary is not currently loaded in memory. Re-upload the file to reopen the editor.`,
      );
      return;
    }

    alert('Please upload a binary file first using the Upload button.');
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

  if (showMapEditor && mapData) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-muted-text">Editor Surface</p>
            <h1 className="mt-2 text-page-headline font-bold">Map Editor</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenPluginsPage}
              className="rounded-lg border border-gridlines-grey px-4 py-2 font-bold text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
            >
              Open Plugins
            </button>
            <button
              type="button"
              onClick={closeMapEditor}
              className="rounded-lg border border-electric-blue bg-carbon-black px-4 py-2 font-bold text-electric-blue transition hover:bg-electric-blue hover:text-carbon-black"
            >
              Back to Workspace
            </button>
          </div>
        </div>

        <MapEditorTabs mapData={mapData} selectedMap={null} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-xl border border-gridlines-grey bg-steel-grey">
        <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-muted-text">Workspace Home</p>
            <h1 className="mt-2 text-page-headline font-bold">Firmware-First Workspace</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-alloy-silver">
              ECUDeck should open into a working environment, not a fake dashboard. Load firmware
              here, then jump into the map editor or the plugin authoring workspace where HEX,
              binary, previews, grouped maps, and copilot assistance live side by side.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUploadClick}
                className="rounded-lg bg-electric-blue px-5 py-3 text-sm font-bold text-carbon-black transition hover:opacity-90"
              >
                Upload Firmware
              </button>
              <button
                type="button"
                onClick={handleBrowseClick}
                className="rounded-lg border border-electric-blue px-5 py-3 text-sm font-semibold text-electric-blue transition hover:bg-electric-blue hover:text-carbon-black"
              >
                Open Map Editor
              </button>
              <button
                type="button"
                onClick={onOpenPluginsPage}
                className="rounded-lg border border-gridlines-grey px-5 py-3 text-sm font-semibold text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
              >
                Open Plugins
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".bin,.ori,.hex"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="rounded-xl border border-gridlines-grey bg-carbon-black/45 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-text">
                  Active Firmware
                </p>
                <h2 className="mt-2 text-lg font-bold text-soft-white">
                  {lastLoadedFirmware?.fileName ?? 'No firmware loaded'}
                </h2>
              </div>
              <StatusPill active={hasLoadedFirmware}>
                {hasLoadedFirmware ? 'In Memory' : lastLoadedFirmware ? 'Summary Only' : 'Empty'}
              </StatusPill>
            </div>

            {lastLoadedFirmware ? (
              <div className="mt-5 space-y-3">
                <InfoRow label="Size" value={formatFileSize(lastLoadedFirmware.size)} />
                <InfoRow
                  label="Checksum"
                  value={lastLoadedFirmware.checksum ?? 'No checksum recorded yet'}
                />
                <InfoRow label="Loaded" value={lastLoadedFirmware.loadedAt} />
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-alloy-silver">
                Upload a BIN, ORI, or HEX file to unlock the editor workspaces.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
        <div className="space-y-6">
          <WorkspaceCard
            eyebrow="Firmware Inspection"
            title="Map Editor"
            description="Inspect the binary in HEX or Binary view, edit bytes directly, keep Map Copilot docked on the right, and work without leaving the firmware surface."
            actionLabel="Open Map Editor"
            onAction={handleBrowseClick}
            highlights={[
              'HEX and Binary viewer',
              'Address jump and direct edits',
              'Copilot docked beside the viewer',
            ]}
          />

          <WorkspaceCard
            eyebrow="Plugin Authoring"
            title="Plugins"
            description="Open the plugin list to launch the authoring workspace where grouped map discovery, ECU identity detection, and copilot-assisted plugin work happen against live firmware."
            actionLabel="Open Plugins"
            onAction={onOpenPluginsPage}
            highlights={[
              'Plugin list and workspaces',
              'Insert-to-capture workflow',
              'Grouped map explorer',
              '2D and 3D candidate previews',
            ]}
          />
        </div>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-gridlines-grey bg-steel-grey">
            <div className="border-b border-gridlines-grey px-5 py-4">
              <h2 className="text-section-title font-bold">Authoring Flow</h2>
              <p className="mt-1 text-sm text-alloy-silver">
                The intended workflow is editor-first, with dashboard concerns kept out of the way.
              </p>
            </div>

            <ol className="space-y-4 px-5 py-5 text-sm leading-6 text-alloy-silver">
              <li>
                1. Load firmware into memory so both editors operate on the live binary, not just
                metadata.
              </li>
              <li>
                2. Inspect the firmware in HEX or Binary view and capture addresses with
                <span className="mx-1 rounded border border-gridlines-grey px-2 py-1 font-mono text-soft-white">
                  Insert
                </span>
                when you find map candidates.
              </li>
              <li>
                3. Open `Plugins`, launch the plugin editor, then group maps, draft ECU identity
                data, preview map surfaces, and review copilot suggestions before turning them into
                plugin rules.
              </li>
            </ol>
          </section>

          <section className="overflow-hidden rounded-xl border border-gridlines-grey bg-steel-grey">
            <div className="border-b border-gridlines-grey px-5 py-4">
              <h2 className="text-section-title font-bold">Detection Targets</h2>
              <p className="mt-1 text-sm text-alloy-silver">
                Plugin authoring should help uncover more than just maps.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 px-5 py-5">
              {[
                'Maps',
                'Single Values',
                'Checksums',
                'ECU Family',
                'Software ID',
                'Part Number',
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-gridlines-grey bg-carbon-black/45 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-alloy-silver"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function WorkspaceCard({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  highlights,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  highlights: string[];
}>) {
  return (
    <section className="overflow-hidden rounded-xl border border-gridlines-grey bg-steel-grey">
      <div className="border-b border-gridlines-grey px-5 py-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-text">{eyebrow}</p>
        <h2 className="mt-2 text-section-title font-bold">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-alloy-silver">{description}</p>
      </div>

      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="space-y-3">
          {highlights.map((highlight) => (
            <div
              key={highlight}
              className="rounded-lg border border-gridlines-grey bg-carbon-black/35 px-4 py-3 text-sm text-soft-white"
            >
              {highlight}
            </div>
          ))}
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={onAction}
            className="w-full rounded-lg border border-electric-blue px-4 py-3 text-sm font-semibold text-electric-blue transition hover:bg-electric-blue hover:text-carbon-black"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </section>
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
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        active
          ? 'border border-electric-blue/50 bg-electric-blue/10 text-electric-blue'
          : 'border border-gridlines-grey text-alloy-silver'
      }`}
    >
      {children}
    </span>
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

function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (sizeInBytes >= 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${sizeInBytes} B`;
}
