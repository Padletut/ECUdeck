// app/editor/MapEditorTabs.tsx
import { useState } from 'react';
import HexViewer from './HexViewer';
import Map2DView from './Map2DView';
import Map3DView from './Map3DView';

const tabs = ['HEX', '2D', '3D'];

interface MapEditorTabsProps {
  mapData: {
    raw: Uint8Array; // Most versatile for binary manipulation
    size: number;
    checksum?: string;
    parsed?: ParsedECUData;
  };
  selectedMap: ECUMap | null;
}

interface ECUMap {
  id: string;
  name: string;
  address: number;
  data: number[][];
  dimensions: { rows: number; cols: number };
  units?: string;
  scaling?: { offset: number; factor: number };
}

interface ECUTable {
  id: string;
  name: string;
  address: number;
  data: number[];
  length: number;
  units?: string;
  scaling?: { offset: number; factor: number };
}

interface ParsedECUData {
  maps: ECUMap[];
  tables: ECUTable[];
  metadata: {
    version: string;
    identifier: string;
    timestamp?: Date;
  };
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
            data={mapData.raw instanceof Uint8Array ? mapData.raw : new Uint8Array(mapData.raw)}
            onDataChange={handleDataChange}
          />
        )}
        {activeTab === '2D' && <Map2DView map={selectedMap} />}
        {activeTab === '3D' && <Map3DView map={selectedMap} />}
      </div>
    </div>
  );
}
