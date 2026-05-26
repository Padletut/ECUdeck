import { useRef, useState } from 'react';

import MapEditorTabs from '../../map-editor/components/MapEditorTabs';
import PluginValidationPanel from '../../plugins/components/PluginValidationPanel';
import type { LoadedFirmwareData } from '../../../shared/types/ecu';

export default function DashboardPage() {
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [mapData, setMapData] = useState<LoadedFirmwareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setLoadingProgress(0);
      setLoadingMessage('Reading file...');

      try {
        setLoadingProgress(25);
        const arrayBuffer = await file.arrayBuffer();

        setLoadingMessage('Processing binary data...');
        setLoadingProgress(50);

        await new Promise((resolve) => setTimeout(resolve, 200));

        const uint8Array = new Uint8Array(arrayBuffer);

        setLoadingMessage('Analyzing ECU firmware...');
        setLoadingProgress(75);

        await new Promise((resolve) => setTimeout(resolve, 300));

        const uploadedData: LoadedFirmwareData = {
          raw: uint8Array,
          size: uint8Array.length,
          checksum: `file-${Date.now()}`,
        };

        setLoadingProgress(100);
        setLoadingMessage('Complete!');

        await new Promise((resolve) => setTimeout(resolve, 200));

        setMapData(uploadedData);
        setShowMapEditor(true);
      } catch (error) {
        console.error('Error reading file:', error);
        setLoadingMessage('Error loading file');
      } finally {
        setLoading(false);
        setLoadingProgress(0);
        setLoadingMessage('');
      }
    }
  };

  const handleBrowseClick = async () => {
    if (mapData) {
      setShowMapEditor(true);
    } else {
      alert('Please upload a binary file first using the Upload button.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-carbon-black/90 flex items-center justify-center z-50">
        <div className="bg-steel-grey p-8 rounded-xl border border-electric-blue max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="animate-spin h-12 w-12 text-electric-blue mx-auto"
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

            <h3 className="text-xl font-bold text-soft-white mb-2">Loading ECU Data</h3>
            <p className="text-alloy-silver mb-4">{loadingMessage}</p>

            <div className="w-full bg-gridlines-grey rounded-full h-2 mb-4">
              <div
                className="bg-electric-blue h-2 rounded-full transition-all duration-300 ease-out"
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-page-headline font-bold">Map Editor</h1>
          <button
            onClick={() => setShowMapEditor(false)}
            className="bg-carbon-black text-electric-blue px-4 py-2 rounded-lg font-bold border border-electric-blue hover:bg-electric-blue hover:text-carbon-black transition"
          >
            Back to Dashboard
          </button>
        </div>
        <MapEditorTabs mapData={mapData} selectedMap={null} />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12 items-start">
        <div className="col-span-3">
          <h1 className="text-page-headline font-bold mb-6">Dashboard Overview UI</h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-steel-grey p-6 rounded-lg text-center border border-gridlines-grey">
              <p className="text-5xl font-bold text-soft-white">5</p>
              <p className="text-lg text-alloy-silver">ECUs</p>
            </div>
            <div className="bg-steel-grey p-6 rounded-lg text-center border border-gridlines-grey">
              <p className="text-5xl font-bold text-soft-white">12</p>
              <p className="text-lg text-alloy-silver">Maps</p>
            </div>
            <div className="bg-steel-grey p-6 rounded-lg text-center border border-gridlines-grey">
              <p className="text-5xl font-bold text-soft-white">40k</p>
              <p className="text-lg text-alloy-silver">Installs</p>
            </div>
          </div>
        </div>

        <div className="col-span-1 flex justify-end">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-32 h-32 rounded-full border border-gridlines-grey flex items-center justify-center shadow-[0_0_0_2px_#4EFFB0] hover:shadow-[0_0_8px_2px_#4EFFB0] transition-shadow">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-20 h-20 text-alloy-silver"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0"
                />
              </svg>
            </div>
            <p className="text-soft-white text-2xl font-bold leading-tight">John Doe</p>
            <button className="text-electric-blue text-lg font-semibold tracking-wide px-4 py-2 border border-electric-blue rounded-lg hover:bg-electric-blue hover:text-carbon-black transition font-bold">
              Manage Profile
            </button>
          </div>
        </div>
      </div>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-section-title font-bold">Recent Maps</h2>
          <span className="bg-dyno-green/10 text-dyno-green font-semibold text-xs px-3 py-1 rounded-full border border-dyno-green">
            Avg. Power +25%
          </span>
        </div>
        <ul className="divide-y divide-gridlines-grey border border-gridlines-grey rounded-lg overflow-hidden">
          {[
            {
              name: 'A123 Boost Targets',
              time: '2h ago',
              highlight: true,
            },
            {
              name: 'EDC15V Fueling',
              time: '5h ago',
            },
            {
              name: 'EDC16 Injection Start',
              time: '1 day ago',
            },
          ].map(({ name, time, highlight }) => (
            <li
              key={name}
              className="bg-steel-grey px-4 py-3 grid grid-cols-12 items-center hover:bg-carbon-black transition-colors cursor-pointer group"
            >
              <span
                className={`col-span-6 font-medium ${highlight ? 'text-alert-amber font-bold' : 'text-soft-white'}`}
              >
                {name}
              </span>
              <span className="text-alloy-silver text-right col-span-5">{time}</span>
              <span className="text-alloy-silver text-right col-span-1 flex justify-end items-center text-xl transform transition-transform group-hover:translate-x-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-alloy-silver group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-steel-grey rounded-lg border border-gridlines-grey overflow-hidden">
          <div className="px-6 py-4 border-b border-gridlines-grey flex items-center justify-between">
            <h2 className="text-section-title font-bold">File Manager</h2>
            <span className="text-alloy-silver text-sm">Upload ECU binary</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="border border-dashed border-gridlines-grey rounded-lg p-8 text-center bg-carbon-black/40">
              <p className="text-soft-white text-lg font-semibold mb-2">Drop binary file here</p>
              <p className="text-alloy-silver text-sm mb-4">Supported formats: .bin, .ori, .hex</p>
              <button
                onClick={handleUploadClick}
                className="bg-electric-blue text-carbon-black px-5 py-2 rounded-lg font-bold hover:opacity-90 transition"
              >
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".bin,.ori,.hex"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleBrowseClick}
                className="rounded-lg border border-electric-blue px-5 py-3 text-electric-blue font-semibold hover:bg-electric-blue hover:text-carbon-black transition"
              >
                Browse Loaded File
              </button>
              <button className="rounded-lg border border-gridlines-grey px-5 py-3 text-alloy-silver font-semibold hover:border-electric-blue hover:text-electric-blue transition">
                Import Metadata
              </button>
            </div>
          </div>
        </div>

        <div className="bg-steel-grey rounded-lg border border-gridlines-grey overflow-hidden">
          <div className="px-6 py-4 border-b border-gridlines-grey flex items-center justify-between">
            <h2 className="text-section-title font-bold">AI Assist</h2>
            <span className="text-alloy-silver text-sm">Preview only</span>
          </div>
          <div className="p-6 space-y-4">
            {[
              'Summarize likely map regions',
              'Compare this file against common Bosch patterns',
              'Generate a first-pass review plan',
            ].map((prompt) => (
              <button
                key={prompt}
                className="w-full text-left rounded-lg border border-gridlines-grey px-4 py-3 text-soft-white hover:border-electric-blue hover:bg-carbon-black transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-12">
        <PluginValidationPanel />
      </section>
    </>
  );
}
