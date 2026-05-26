import { useState } from 'react';

import type { EcuMap, LoadedFirmwareData } from '../../../shared/types/ecu';
import HexViewer from './HexViewer';
import Map2DView from './Map2DView';
import Map3DView from './Map3DView';
import MapCopilotPanel from './MapCopilotPanel';

const tabs = ['HEX', '2D', '3D'];

interface MapEditorTabsProps {
  mapData: LoadedFirmwareData;
  selectedMap: EcuMap | null;
}

export default function MapEditorTabs({ mapData, selectedMap }: MapEditorTabsProps) {
  const [activeTab, setActiveTab] = useState('HEX');
  const [currentMapData, setCurrentMapData] = useState(mapData);

  const handleDataChange = (newData: Uint8Array) => {
    setCurrentMapData({
      ...currentMapData,
      raw: newData,
      size: newData.length,
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="bg-carbon-black text-soft-white w-full rounded-xl p-4">
        <div className="flex space-x-4 border-b border-gridlines-grey mb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 font-bold uppercase tracking-widest text-sm rounded-t-md border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-electric-blue text-electric-blue'
                  : 'border-transparent hover:text-electric-blue'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab} VIEW
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === 'HEX' && (
            <HexViewer
              data={
                currentMapData.raw instanceof Uint8Array
                  ? currentMapData.raw
                  : new Uint8Array(currentMapData.raw)
              }
              onDataChange={handleDataChange}
            />
          )}
          {activeTab === '2D' && <Map2DView map={selectedMap} />}
          {activeTab === '3D' && <Map3DView map={selectedMap} />}
        </div>
      </div>

      <MapCopilotPanel />
    </div>
  );
}
