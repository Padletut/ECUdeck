import { useEffect, useMemo, useState } from 'react';

import {
  useWorkspaceFirmware,
  useWorkspaceScope,
} from '../../../app/providers/WorkspaceScopeProvider';
import type { EcuMap, LoadedFirmwareData } from '../../../shared/types/ecu';
import type {
  PluginCompatibilityStatus,
  PluginValidationReport,
} from '../../../shared/types/plugins';
import HexViewer, { type HexViewerSelection } from '../../map-editor/components/HexViewer';
import Map2DView from '../../map-editor/components/Map2DView';
import Map3DView from '../../map-editor/components/Map3DView';
import PluginCopilotPanel from './PluginCopilotPanel';
import PluginValidationPanel from './PluginValidationPanel';

type PluginEditorView = 'hex' | '2d' | '3d';

interface PluginEditorProps {
  mapData: LoadedFirmwareData;
  onBackToDashboard: () => void;
  onReturnToMapEditor: () => void;
}

interface PluginMapGroup {
  id: string;
  name: string;
}

interface PluginFoundMap {
  id: string;
  name: string;
  groupId: string;
  address: number;
  byteLength: number;
  rows: number;
  cols: number;
  units: string;
  notes: string;
}

interface CapturedMapDraft {
  name: string;
  groupId: string;
  addressHex: string;
  byteLength: number;
  rows: number;
  cols: number;
  units: string;
  notes: string;
}

interface FirmwareMetadataDraft {
  ecuFamily: string;
  ecuModel: string;
  softwareId: string;
  partNumber: string;
}

const DEFAULT_GROUP_NAME = 'Unsorted Maps';
const DEFAULT_CAPTURED_MAP_DRAFT: CapturedMapDraft = {
  name: '',
  groupId: '',
  addressHex: '',
  byteLength: 1,
  rows: 8,
  cols: 8,
  units: '',
  notes: '',
};

export default function PluginEditor({
  mapData,
  onBackToDashboard,
  onReturnToMapEditor,
}: Readonly<PluginEditorProps>) {
  const { ownership } = useWorkspaceScope();
  const { lastLoadedFirmware } = useWorkspaceFirmware();
  const [currentMapData, setCurrentMapData] = useState(mapData);
  const [activeView, setActiveView] = useState<PluginEditorView>('hex');
  const [activeRuntimeReport, setActiveRuntimeReport] = useState<PluginValidationReport | null>(
    null,
  );
  const [showRuntimeValidation, setShowRuntimeValidation] = useState(false);
  const [groups, setGroups] = useState<PluginMapGroup[]>(() => [
    {
      id: createId('group'),
      name: DEFAULT_GROUP_NAME,
    },
  ]);
  const [newGroupName, setNewGroupName] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [foundMaps, setFoundMaps] = useState<PluginFoundMap[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [capturedSelection, setCapturedSelection] = useState<HexViewerSelection | null>(null);
  const [capturedMapDraft, setCapturedMapDraft] = useState<CapturedMapDraft>(
    DEFAULT_CAPTURED_MAP_DRAFT,
  );
  const [firmwareMetadataDraft, setFirmwareMetadataDraft] = useState<FirmwareMetadataDraft>({
    ecuFamily: '',
    ecuModel: '',
    softwareId: '',
    partNumber: '',
  });
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMapData(mapData);
  }, [mapData]);

  useEffect(() => {
    if (activeGroupId && groups.some((group) => group.id === activeGroupId)) {
      return;
    }

    setActiveGroupId(groups[0]?.id ?? null);
  }, [activeGroupId, groups]);

  const selectedMap = useMemo(
    () => foundMaps.find((map) => map.id === selectedMapId) ?? null,
    [foundMaps, selectedMapId],
  );

  const mapsByGroup = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      maps: foundMaps.filter((map) => map.groupId === group.id),
    }));
  }, [foundMaps, groups]);

  const draftPreviewMap = useMemo(
    () => buildDraftPreviewMap(capturedMapDraft, currentMapData.raw),
    [capturedMapDraft, currentMapData.raw],
  );

  const selectedPreviewMap = useMemo(
    () =>
      selectedMap
        ? buildPreviewMap(selectedMap, currentMapData.raw)
        : capturedSelection
          ? draftPreviewMap
          : null,
    [capturedSelection, currentMapData.raw, draftPreviewMap, selectedMap],
  );

  const inspectorTitle = selectedMap
    ? selectedMap.name
    : capturedSelection
      ? 'Captured Selection'
      : 'No active selection';
  const canSaveMap = Boolean(capturedMapDraft.groupId && capturedMapDraft.name.trim());
  const activeScopeLabel = [ownership.workspaceId, ownership.projectId, ownership.sessionId]
    .filter(Boolean)
    .join(' / ');
  const previewSourceLabel = selectedMap
    ? 'Saved map'
    : capturedSelection
      ? 'Draft candidate'
      : 'No preview';

  const handleDataChange = (newData: Uint8Array) => {
    setCurrentMapData((currentData) => ({
      ...currentData,
      raw: newData,
      size: newData.length,
    }));
  };

  const handleCaptureSelection = (selection: HexViewerSelection) => {
    const defaultGroupId = activeGroupId ?? groups[0]?.id ?? '';

    setSelectedMapId(null);
    setCapturedSelection(selection);
    setCaptureError(null);
    setCapturedMapDraft({
      name: `Found Map 0x${selection.offset.toString(16).padStart(6, '0')}`,
      groupId: defaultGroupId,
      addressHex: `0x${selection.offset.toString(16).padStart(6, '0')}`,
      byteLength: selection.byteLength,
      rows: selection.byteLength >= 4 ? 8 : 12,
      cols: selection.byteLength >= 4 ? 8 : 10,
      units: '',
      notes: `Captured via Insert from ${selection.viewMode.toUpperCase()} view (${selection.displayValue}).`,
    });
  };

  const handleAddGroup = () => {
    const nextGroupName = newGroupName.trim();

    if (!nextGroupName) {
      return;
    }

    const nextGroup = {
      id: createId('group'),
      name: nextGroupName,
    };

    setGroups((currentGroups) => [...currentGroups, nextGroup]);
    setActiveGroupId(nextGroup.id);
    setNewGroupName('');
    setCapturedMapDraft((currentDraft) => ({
      ...currentDraft,
      groupId: nextGroup.id,
    }));
  };

  const handleRenameGroup = (groupId: string, value: string) => {
    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              name: value,
            }
          : group,
      ),
    );
  };

  const handleSelectMap = (mapId: string) => {
    const nextMap = foundMaps.find((map) => map.id === mapId);

    if (!nextMap) {
      return;
    }

    setSelectedMapId(nextMap.id);
    setActiveGroupId(nextMap.groupId);
    setCapturedSelection({
      offset: nextMap.address,
      endOffset: nextMap.address + nextMap.rows * nextMap.cols * nextMap.byteLength - 1,
      byteLength: nextMap.byteLength,
      displayValue: nextMap.name,
      viewMode: 'hex',
      bitWidth: 8,
    });
    setCapturedMapDraft({
      name: nextMap.name,
      groupId: nextMap.groupId,
      addressHex: `0x${nextMap.address.toString(16).padStart(6, '0')}`,
      byteLength: nextMap.byteLength,
      rows: nextMap.rows,
      cols: nextMap.cols,
      units: nextMap.units,
      notes: nextMap.notes,
    });
    setActiveView('2d');
    setCaptureError(null);
  };

  const handleSaveMap = () => {
    const normalizedAddress = parseHexAddress(capturedMapDraft.addressHex);

    if (normalizedAddress === null) {
      setCaptureError('Address must be a valid hex value like 0x1A2B3C.');
      return;
    }

    if (!capturedMapDraft.groupId) {
      setCaptureError('Choose a map group before saving.');
      return;
    }

    const nextMap: PluginFoundMap = {
      id: selectedMap?.id ?? createId('map'),
      name: capturedMapDraft.name.trim() || 'Unnamed Map',
      groupId: capturedMapDraft.groupId,
      address: normalizedAddress,
      byteLength: clampValue(capturedMapDraft.byteLength, 1, 4),
      rows: clampValue(capturedMapDraft.rows, 1, 64),
      cols: clampValue(capturedMapDraft.cols, 1, 64),
      units: capturedMapDraft.units.trim(),
      notes: capturedMapDraft.notes.trim(),
    };

    setFoundMaps((currentMaps) => {
      if (selectedMap) {
        return currentMaps.map((map) => (map.id === selectedMap.id ? nextMap : map));
      }

      return [...currentMaps, nextMap];
    });

    setSelectedMapId(nextMap.id);
    setActiveGroupId(nextMap.groupId);
    setCaptureError(null);
    setCapturedSelection({
      offset: nextMap.address,
      endOffset: nextMap.address + nextMap.rows * nextMap.cols * nextMap.byteLength - 1,
      byteLength: nextMap.byteLength,
      displayValue: nextMap.name,
      viewMode: 'hex',
      bitWidth: 8,
    });
  };

  const handleRemoveSelectedMap = () => {
    if (!selectedMap) {
      return;
    }

    setFoundMaps((currentMaps) => currentMaps.filter((map) => map.id !== selectedMap.id));
    setSelectedMapId(null);
    setCapturedSelection(null);
    setCapturedMapDraft({
      ...DEFAULT_CAPTURED_MAP_DRAFT,
      groupId: activeGroupId ?? groups[0]?.id ?? '',
    });
    setCaptureError(null);
    setActiveView('hex');
  };

  const handleUpdateDraftField = <Field extends keyof CapturedMapDraft>(
    field: Field,
    value: CapturedMapDraft[Field],
  ) => {
    setCapturedMapDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const handleUpdateMetadataField = <Field extends keyof FirmwareMetadataDraft>(
    field: Field,
    value: FirmwareMetadataDraft[Field],
  ) => {
    setFirmwareMetadataDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted-text">Plugin Authoring</p>
          <h1 className="mt-2 text-page-headline font-bold">Plugin Editor</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-alloy-silver">
            Firmware-driven authoring workspace with map explorer, grouped findings, metadata
            drafting, runtime validation, and a docked plugin copilot.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onReturnToMapEditor}
            className="rounded-lg border border-gridlines-grey px-4 py-2 text-sm font-semibold text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
          >
            Open Map Editor
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="rounded-lg border border-electric-blue px-4 py-2 text-sm font-semibold text-electric-blue transition hover:bg-electric-blue hover:text-carbon-black"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
          <div className="border-b border-gridlines-grey px-5 py-4">
            <h2 className="text-section-title font-bold">Firmware Facts</h2>
            <p className="mt-1 text-sm text-alloy-silver">
              Keep ECU identity and sample context visible above the working surface while you
              author the plugin.
            </p>
          </div>

          <div className="grid gap-4 px-5 py-5 lg:grid-cols-2 2xl:grid-cols-3">
            <InfoCard label="Loaded Sample" value={lastLoadedFirmware?.fileName ?? 'No sample'} />
            <InfoCard label="Scope" value={activeScopeLabel || 'Unscoped'} />
            <MetadataField
              label="ECU Family"
              value={firmwareMetadataDraft.ecuFamily}
              onChange={(value) => handleUpdateMetadataField('ecuFamily', value)}
              placeholder="EDC16U31"
            />
            <MetadataField
              label="ECU Model"
              value={firmwareMetadataDraft.ecuModel}
              onChange={(value) => handleUpdateMetadataField('ecuModel', value)}
              placeholder="Bosch EDC16"
            />
            <MetadataField
              label="Software ID"
              value={firmwareMetadataDraft.softwareId}
              onChange={(value) => handleUpdateMetadataField('softwareId', value)}
              placeholder="1037390909"
              mono
            />
            <MetadataField
              label="Part Number"
              value={firmwareMetadataDraft.partNumber}
              onChange={(value) => handleUpdateMetadataField('partNumber', value)}
              placeholder="03G906021AB"
              mono
            />
          </div>
        </section>

        <main className="space-y-6 xl:row-start-2">
          <section className="overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
            <div className="border-b border-gridlines-grey px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-section-title font-bold">Firmware Surface</h2>
                  <p className="mt-1 text-sm text-alloy-silver">
                    Inspect the binary, preview candidate maps, and press `Insert` to send the
                    current selection into the plugin authoring flow.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                    {previewSourceLabel}
                  </span>
                  {(
                    [
                      ['hex', 'HEX'],
                      ['2d', '2D'],
                      ['3d', '3D'],
                    ] as const
                  ).map(([view, label]) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveView(view)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        activeView === view
                          ? 'bg-electric-blue text-carbon-black'
                          : 'border border-gridlines-grey text-alloy-silver hover:border-electric-blue hover:text-electric-blue'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5">
              {activeView === 'hex' ? (
                <HexViewer
                  data={
                    currentMapData.raw instanceof Uint8Array
                      ? currentMapData.raw
                      : new Uint8Array(currentMapData.raw)
                  }
                  onDataChange={handleDataChange}
                  onInsertSelection={handleCaptureSelection}
                />
              ) : activeView === '2d' ? (
                <Map2DView map={selectedPreviewMap} />
              ) : (
                <Map3DView map={selectedPreviewMap} />
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
            <div className="border-b border-gridlines-grey px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-section-title font-bold">Map Explorer</h2>
                  <p className="mt-1 text-sm text-alloy-silver">
                    Group found maps the way you want to structure the plugin.
                  </p>
                </div>
                <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                  {foundMaps.length} maps
                </span>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="flex gap-3">
                <input
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddGroup();
                    }
                  }}
                  placeholder="New group name"
                  className="min-w-0 flex-1 rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm text-soft-white outline-none transition focus:border-electric-blue"
                />
                <button
                  type="button"
                  onClick={handleAddGroup}
                  className="rounded-lg border border-electric-blue px-4 py-3 text-sm font-semibold text-electric-blue transition hover:bg-electric-blue/10"
                >
                  Add
                </button>
              </div>

              <div className="space-y-4">
                {mapsByGroup.map((group) => {
                  const isActive = group.id === activeGroupId;

                  return (
                    <div
                      key={group.id}
                      className={`rounded-lg border p-4 ${
                        isActive
                          ? 'border-electric-blue bg-electric-blue/5'
                          : 'border-gridlines-grey bg-carbon-black/35'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveGroupId(group.id)}
                        className="w-full text-left"
                      >
                        <p className="font-semibold text-soft-white">
                          {group.name || 'Untitled group'}
                        </p>
                        <p className="mt-1 text-xs text-alloy-silver">
                          {group.maps.length} linked map{group.maps.length === 1 ? '' : 's'}
                        </p>
                      </button>

                      {isActive ? (
                        <div className="mt-4 space-y-3">
                          <input
                            value={group.name}
                            onChange={(event) => handleRenameGroup(group.id, event.target.value)}
                            className="w-full rounded-lg border border-gridlines-grey bg-carbon-black px-3 py-2 text-sm text-soft-white outline-none transition focus:border-electric-blue"
                          />

                          {group.maps.length > 0 ? (
                            <ul className="space-y-2">
                              {group.maps.map((map) => {
                                const isSelected = map.id === selectedMapId;

                                return (
                                  <li key={map.id}>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectMap(map.id)}
                                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                                        isSelected
                                          ? 'border-electric-blue bg-electric-blue/10 text-electric-blue'
                                          : 'border-gridlines-grey text-alloy-silver hover:border-electric-blue hover:text-electric-blue'
                                      }`}
                                    >
                                      <p className="font-semibold">{map.name}</p>
                                      <p className="mt-1 font-mono text-xs">
                                        {formatAddress(map.address)} · {map.rows} x {map.cols}
                                      </p>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-sm leading-6 text-alloy-silver">
                              No maps in this group yet. Capture an address with `Insert` and save
                              it into this group.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
            <div className="border-b border-gridlines-grey px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-section-title font-bold">{inspectorTitle}</h2>
                  <p className="mt-1 text-sm text-alloy-silver">
                    Capture binary selections into editable map definitions, then group them the way
                    the plugin should expose them.
                  </p>
                </div>
                {capturedSelection ? (
                  <span className="rounded-full border border-electric-blue/50 bg-electric-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-electric-blue">
                    {formatAddress(capturedSelection.offset)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              {capturedSelection ? (
                <div className="rounded-lg border border-gridlines-grey bg-carbon-black/35 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                      {capturedSelection.viewMode.toUpperCase()}
                    </span>
                    <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                      {capturedSelection.byteLength} byte
                      {capturedSelection.byteLength === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-alloy-silver">
                      {formatAddress(capturedSelection.offset)} -{' '}
                      {formatAddress(capturedSelection.endOffset)}
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-sm text-soft-white">
                    {capturedSelection.displayValue}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveView('hex')}
                      className="rounded-lg border border-gridlines-grey px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue"
                    >
                      HEX Surface
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('2d')}
                      disabled={!selectedPreviewMap}
                      className="rounded-lg border border-gridlines-grey px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      2D Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('3d')}
                      disabled={!selectedPreviewMap}
                      className="rounded-lg border border-gridlines-grey px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-alloy-silver transition hover:border-electric-blue hover:text-electric-blue disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      3D Preview
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gridlines-grey bg-carbon-black/35 px-4 py-5 text-sm leading-6 text-alloy-silver">
                  Click a byte or binary cell in the firmware surface and press `Insert` to start a
                  map candidate directly from the active address.
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <LabeledInput
                  label="Map Name"
                  value={capturedMapDraft.name}
                  onChange={(value) => handleUpdateDraftField('name', value)}
                  placeholder="Driver wish torque"
                />
                <div>
                  <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                    Group
                  </label>
                  <select
                    value={capturedMapDraft.groupId}
                    onChange={(event) => handleUpdateDraftField('groupId', event.target.value)}
                    className="ecu-select w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm text-soft-white outline-none transition focus:border-electric-blue"
                  >
                    <option value="">Choose group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name || 'Untitled group'}
                      </option>
                    ))}
                  </select>
                </div>
                <LabeledInput
                  label="Address"
                  value={capturedMapDraft.addressHex}
                  onChange={(value) => handleUpdateDraftField('addressHex', value)}
                  placeholder="0x0012AB"
                  mono
                />
                <LabeledNumberInput
                  label="Cell Width (bytes)"
                  value={capturedMapDraft.byteLength}
                  onChange={(value) => handleUpdateDraftField('byteLength', value)}
                  min={1}
                  max={4}
                />
                <LabeledNumberInput
                  label="Rows"
                  value={capturedMapDraft.rows}
                  onChange={(value) => handleUpdateDraftField('rows', value)}
                  min={1}
                  max={64}
                />
                <LabeledNumberInput
                  label="Cols"
                  value={capturedMapDraft.cols}
                  onChange={(value) => handleUpdateDraftField('cols', value)}
                  min={1}
                  max={64}
                />
                <LabeledInput
                  label="Units"
                  value={capturedMapDraft.units}
                  onChange={(value) => handleUpdateDraftField('units', value)}
                  placeholder="mg/stk"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                  Notes
                </label>
                <textarea
                  value={capturedMapDraft.notes}
                  onChange={(event) => handleUpdateDraftField('notes', event.target.value)}
                  placeholder="Why this region matters, what the copilot suggested, or how this map should be grouped."
                  rows={4}
                  className="w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm leading-6 text-soft-white outline-none transition focus:border-electric-blue"
                />
              </div>

              {captureError ? (
                <div className="rounded-lg border border-fail-red/40 bg-fail-red/10 px-4 py-3 text-sm text-fail-red">
                  {captureError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveMap}
                  disabled={!canSaveMap}
                  className="rounded-lg bg-electric-blue px-5 py-3 text-sm font-semibold text-carbon-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedMap ? 'Update Found Map' : 'Add Found Map'}
                </button>
                {selectedMap ? (
                  <button
                    type="button"
                    onClick={handleRemoveSelectedMap}
                    className="rounded-lg border border-gridlines-grey px-5 py-3 text-sm font-semibold text-alloy-silver transition hover:border-fail-red hover:text-fail-red"
                  >
                    Remove Map
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-6 xl:col-start-2 xl:row-start-2">
          <PluginCopilotPanel />

          <section className="overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
            <div className="border-b border-gridlines-grey px-5 py-4">
              <h2 className="text-section-title font-bold">Detection Focus</h2>
              <p className="mt-1 text-sm text-alloy-silver">
                Keep the copilot aimed at the data you are actively trying to identify.
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
                  className="rounded-full border border-gridlines-grey bg-carbon-black/35 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-alloy-silver"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gridlines-grey bg-steel-grey">
            <div className="border-b border-gridlines-grey px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-section-title font-bold">Runtime Status</h2>
                  <p className="mt-1 text-sm text-alloy-silver">
                    Keep the working surface front-and-center. Open runtime validation only when you
                    actually need the contract report.
                  </p>
                </div>
                {activeRuntimeReport ? (
                  <span className={statusBadgeClassName(activeRuntimeReport.status)}>
                    {formatStatusLabel(activeRuntimeReport.status)}
                  </span>
                ) : (
                  <span className="rounded-full border border-gridlines-grey px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver">
                    Draft only
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <InfoCard
                label="Plugin Runtime"
                value={
                  activeRuntimeReport
                    ? `${formatStatusLabel(activeRuntimeReport.status)} · ${activeRuntimeReport.findings.length} finding${activeRuntimeReport.findings.length === 1 ? '' : 's'}`
                    : 'No manifest validated in this session yet'
                }
              />
              <button
                type="button"
                onClick={() => setShowRuntimeValidation((currentValue) => !currentValue)}
                className="rounded-lg border border-electric-blue px-4 py-3 text-sm font-semibold text-electric-blue transition hover:bg-electric-blue/10"
              >
                {showRuntimeValidation ? 'Hide Runtime Validation' : 'Open Runtime Validation'}
              </button>
            </div>
          </section>
        </aside>
      </div>

      {showRuntimeValidation ? (
        <PluginValidationPanel onReportChange={setActiveRuntimeReport} />
      ) : null}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mono?: boolean;
}>) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm text-soft-white outline-none transition focus:border-electric-blue ${
          mono ? 'font-mono' : ''
        }`}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}

function LabeledNumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: Readonly<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}>) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-alloy-silver">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value) || min)}
        className="w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm text-soft-white outline-none transition focus:border-electric-blue"
      />
    </div>
  );
}

function MetadataField({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mono?: boolean;
}>) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-alloy-silver">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-gridlines-grey bg-carbon-black px-4 py-3 text-sm text-soft-white outline-none transition focus:border-electric-blue ${
          mono ? 'font-mono' : ''
        }`}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}

function InfoCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-gridlines-grey bg-carbon-black/35 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-text">{label}</p>
      <p className="mt-2 text-sm leading-6 text-soft-white">{value}</p>
    </div>
  );
}

function buildPreviewMap(foundMap: PluginFoundMap, rawData: Uint8Array): EcuMap | null {
  const rows = clampValue(foundMap.rows, 1, 64);
  const cols = clampValue(foundMap.cols, 1, 64);
  const bytesPerCell = clampValue(foundMap.byteLength, 1, 4);
  const requiredBytes = rows * cols * bytesPerCell;

  if (foundMap.address < 0 || foundMap.address + requiredBytes > rawData.length) {
    return null;
  }

  const values = Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => {
      const cellOffset = foundMap.address + (rowIndex * cols + colIndex) * bytesPerCell;
      let value = 0;

      for (let byteIndex = 0; byteIndex < bytesPerCell; byteIndex++) {
        value |= (rawData[cellOffset + byteIndex] ?? 0) << (byteIndex * 8);
      }

      return value;
    }),
  );

  return {
    id: foundMap.id,
    name: foundMap.name,
    address: foundMap.address,
    data: values,
    dimensions: {
      rows,
      cols,
    },
    units: foundMap.units || undefined,
    xAxis: Array.from({ length: cols }, (_, index) => index),
    yAxis: Array.from({ length: rows }, (_, index) => index),
    values,
  };
}

function buildDraftPreviewMap(draft: CapturedMapDraft, rawData: Uint8Array): EcuMap | null {
  const address = parseHexAddress(draft.addressHex);

  if (address === null) {
    return null;
  }

  return buildPreviewMap(
    {
      id: 'draft-preview',
      name: draft.name.trim() || 'Draft Preview',
      groupId: draft.groupId,
      address,
      byteLength: clampValue(draft.byteLength, 1, 4),
      rows: clampValue(draft.rows, 1, 64),
      cols: clampValue(draft.cols, 1, 64),
      units: draft.units.trim(),
      notes: draft.notes.trim(),
    },
    rawData,
  );
}

function parseHexAddress(value: string): number | null {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  const strippedValue = normalizedValue.startsWith('0x')
    ? normalizedValue.slice(2)
    : normalizedValue;

  if (!/^[0-9a-f]+$/.test(strippedValue)) {
    return null;
  }

  const parsedValue = Number.parseInt(strippedValue, 16);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function formatAddress(value: number): string {
  return `0x${value.toString(16).padStart(6, '0')}`;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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
    default:
      return 'rounded-full border border-fail-red/50 bg-fail-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-fail-red';
  }
}

function formatStatusLabel(status: PluginCompatibilityStatus): string {
  switch (status) {
    case 'partially-compatible':
      return 'Partially Compatible';
    case 'compatible':
      return 'Compatible';
    case 'valid':
      return 'Valid';
    case 'loadable':
      return 'Loadable';
    case 'rejected':
    default:
      return 'Rejected';
  }
}
