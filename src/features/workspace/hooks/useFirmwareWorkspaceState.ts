import { useEffect, useState } from 'react';

import { firmwareWorkspaceStore } from '../../../services/storage/firmwareWorkspaceStore';
import type { LoadedFirmwareData, PersistedFirmwareSummary } from '../../../shared/types/ecu';
import type { PluginReferenceOwnership } from '../../../shared/types/plugins';

interface FirmwareWorkspaceState {
  showMapEditor: boolean;
  mapData: LoadedFirmwareData | null;
  lastLoadedFirmware: PersistedFirmwareSummary | null;
  loading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  hasLoadedFirmware: boolean;
  loadFirmwareFile: (file: File) => Promise<void>;
  openMapEditor: () => void;
  closeMapEditor: () => void;
}

export function useFirmwareWorkspaceState(
  ownership: PluginReferenceOwnership,
): FirmwareWorkspaceState {
  const [lastLoadedFirmware, setLastLoadedFirmware] = useState<PersistedFirmwareSummary | null>(
    () => firmwareWorkspaceStore.loadState(ownership).lastLoadedFirmware ?? null,
  );
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [mapData, setMapData] = useState<LoadedFirmwareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    const nextState = firmwareWorkspaceStore.loadState(ownership);

    setLastLoadedFirmware(nextState.lastLoadedFirmware ?? null);
    setMapData(null);
    setShowMapEditor(false);
    setLoading(false);
    setLoadingProgress(0);
    setLoadingMessage('');
  }, [ownership.workspaceId, ownership.projectId, ownership.sessionId]);

  const loadFirmwareFile = async (file: File) => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Reading file...');

    try {
      setLoadingProgress(25);
      const arrayBuffer = await file.arrayBuffer();

      setLoadingMessage('Processing binary data...');
      setLoadingProgress(50);

      await pause(200);

      const uint8Array = new Uint8Array(arrayBuffer);

      setLoadingMessage('Analyzing ECU firmware...');
      setLoadingProgress(75);

      await pause(300);

      const uploadedData: LoadedFirmwareData = {
        raw: uint8Array,
        size: uint8Array.length,
        checksum: `file-${Date.now()}`,
      };
      const nextState = firmwareWorkspaceStore.recordLoadedFirmware({
        ownership,
        fileName: file.name,
        size: uploadedData.size,
        checksum: uploadedData.checksum,
      });

      setLoadingProgress(100);
      setLoadingMessage('Complete!');

      await pause(200);

      setLastLoadedFirmware(nextState.lastLoadedFirmware ?? null);
      setMapData(uploadedData);
      setShowMapEditor(true);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setLoadingMessage('');
    }
  };

  return {
    showMapEditor,
    mapData,
    lastLoadedFirmware,
    loading,
    loadingProgress,
    loadingMessage,
    hasLoadedFirmware: mapData !== null,
    loadFirmwareFile,
    openMapEditor: () => {
      if (mapData) {
        setShowMapEditor(true);
      }
    },
    closeMapEditor: () => {
      setShowMapEditor(false);
    },
  };
}

function pause(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
