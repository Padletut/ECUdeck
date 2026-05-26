import { useState, useCallback } from 'react';

interface HexViewerProps {
  data: Uint8Array;
  onDataChange?: (newData: Uint8Array) => void;
}

export default function HexViewer({ data, onDataChange }: HexViewerProps) {
  const [editableData, setEditableData] = useState(new Uint8Array(data));
  const [editingCell, setEditingCell] = useState<{ line: number; byte: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [currentAddress, setCurrentAddress] = useState(0);
  const [addressInput, setAddressInput] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ line: number; byte: number } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewMode, setViewMode] = useState<'hex' | 'binary'>('hex');
  const [bitWidth, setBitWidth] = useState<8 | 16 | 32>(8);

  const ROWS_PER_SCREEN = 20;
  const ROW_HEIGHT = 24;
  const BYTES_PER_ROW = 16;

  const totalRows = Math.ceil(editableData.length / BYTES_PER_ROW);
  const startRow = Math.floor(scrollTop / ROW_HEIGHT);
  const endRow = Math.min(startRow + ROWS_PER_SCREEN + 5, totalRows);

  const visibleLines: Array<{ offset: number; hex: string[]; ascii: string[]; rowIndex: number }> =
    [];
  for (let rowIdx = startRow; rowIdx < endRow; rowIdx++) {
    const offset = rowIdx * BYTES_PER_ROW;
    const chunk = editableData.slice(offset, offset + BYTES_PER_ROW);
    if (chunk.length > 0) {
      let hex: string[] = [];

      if (viewMode === 'hex') {
        hex = Array.from(chunk).map((b) => b.toString(16).padStart(2, '0'));
      } else {
        if (bitWidth === 8) {
          hex = Array.from(chunk).map((b) => b.toString(2).padStart(8, '0'));
        } else if (bitWidth === 16) {
          for (let i = 0; i < chunk.length; i += 2) {
            if (i + 1 < chunk.length) {
              const value = chunk[i] | (chunk[i + 1] << 8);
              hex.push(value.toString(2).padStart(16, '0'));
            } else {
              hex.push(chunk[i].toString(2).padStart(8, '0'));
            }
          }
        } else if (bitWidth === 32) {
          for (let i = 0; i < chunk.length; i += 4) {
            if (i + 3 < chunk.length) {
              const value =
                chunk[i] | (chunk[i + 1] << 8) | (chunk[i + 2] << 16) | (chunk[i + 3] << 24);
              hex.push((value >>> 0).toString(2).padStart(32, '0'));
            } else {
              const remaining = chunk.slice(i, i + 4);
              for (const byte of remaining) {
                hex.push(byte.toString(2).padStart(8, '0'));
              }
            }
          }
        }
      }

      const ascii = Array.from(chunk).map((b) =>
        b > 31 && b < 127 ? String.fromCharCode(b) : '.',
      );
      visibleLines.push({ offset, hex, ascii, rowIndex: rowIdx });
    }
  }

  const handleHexEdit = useCallback(
    (row: number, byte: number, value: string) => {
      if (value.length !== 2 || !/^[0-9A-Fa-f]{2}$/.test(value)) {
        return;
      }

      const absoluteByteIndex = row * BYTES_PER_ROW + byte;
      const updatedData = new Uint8Array(editableData);
      updatedData[absoluteByteIndex] = parseInt(value, 16);

      setEditableData(updatedData);
      onDataChange?.(updatedData);
      setEditingCell(null);
      setEditingValue('');
    },
    [editableData, onDataChange],
  );

  const handleBinaryEdit = useCallback(
    (row: number, chunkIndex: number, value: string) => {
      if (!/^[01]+$/.test(value) || ![8, 16, 32].includes(value.length)) {
        return;
      }

      const absoluteByteIndex = row * BYTES_PER_ROW + chunkIndex * (value.length / 8);
      const updatedData = new Uint8Array(editableData);

      if (value.length === 8) {
        updatedData[absoluteByteIndex] = parseInt(value, 2);
      } else if (value.length === 16) {
        const num = parseInt(value, 2);
        updatedData[absoluteByteIndex] = num & 0xff;
        updatedData[absoluteByteIndex + 1] = (num >> 8) & 0xff;
      } else if (value.length === 32) {
        const num = parseInt(value, 2) >>> 0;
        updatedData[absoluteByteIndex] = num & 0xff;
        updatedData[absoluteByteIndex + 1] = (num >> 8) & 0xff;
        updatedData[absoluteByteIndex + 2] = (num >> 16) & 0xff;
        updatedData[absoluteByteIndex + 3] = (num >> 24) & 0xff;
      }

      setEditableData(updatedData);
      onDataChange?.(updatedData);
      setEditingCell(null);
      setEditingValue('');
    },
    [editableData, onDataChange],
  );

  const handleCellClick = (row: number, byte: number, currentValue: string) => {
    setEditingCell({ line: row, byte });
    setEditingValue(currentValue);
    setSelectedCell({ line: row, byte });
  };

  const handleAddressJump = () => {
    const address = parseInt(addressInput, 16);
    if (!Number.isNaN(address) && address >= 0 && address < editableData.length) {
      setCurrentAddress(address);
      const targetRow = Math.floor(address / BYTES_PER_ROW);
      const newScrollTop = targetRow * ROW_HEIGHT;
      setScrollTop(newScrollTop);

      const scrollContainer = document.querySelector('.overflow-auto') as HTMLElement | null;
      if (scrollContainer) {
        scrollContainer.scrollTop = newScrollTop;
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = totalRows * ROW_HEIGHT;

  return (
    <div className="bg-steel-grey rounded-xl border border-gridlines-grey overflow-hidden">
      <div className="border-b border-gridlines-grey p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="address-jump" className="text-sm font-semibold text-alloy-silver">
            Jump to address
          </label>
          <input
            id="address-jump"
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="0x0000"
            className="bg-carbon-black border border-gridlines-grey rounded px-3 py-2 text-soft-white"
          />
          <button
            onClick={handleAddressJump}
            className="rounded border border-electric-blue px-3 py-2 text-electric-blue hover:bg-electric-blue hover:text-carbon-black transition"
          >
            Go
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-alloy-silver">View</span>
          {(['hex', 'binary'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded px-3 py-2 text-sm font-semibold transition ${
                viewMode === mode
                  ? 'bg-electric-blue text-carbon-black'
                  : 'border border-gridlines-grey text-alloy-silver hover:border-electric-blue hover:text-electric-blue'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        {viewMode === 'binary' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-alloy-silver">Bit width</span>
            {([8, 16, 32] as const).map((width) => (
              <button
                key={width}
                onClick={() => setBitWidth(width)}
                className={`rounded px-3 py-2 text-sm font-semibold transition ${
                  bitWidth === width
                    ? 'bg-electric-blue text-carbon-black'
                    : 'border border-gridlines-grey text-alloy-silver hover:border-electric-blue hover:text-electric-blue'
                }`}
              >
                {width}
              </button>
            ))}
          </div>
        )}

        <div className="text-sm text-alloy-silver ml-auto">
          Current address: <span className="text-soft-white">0x{currentAddress.toString(16)}</span>
        </div>
      </div>

      <div className="overflow-auto h-[600px]" onScroll={handleScroll}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: startRow * ROW_HEIGHT,
              left: 0,
              right: 0,
            }}
          >
            {visibleLines.map(({ offset, hex, ascii, rowIndex }) => (
              <div
                key={offset}
                className="grid grid-cols-[120px_1fr_160px] gap-4 items-center px-4 py-1 font-mono text-sm border-b border-gridlines-grey/50"
                style={{ height: ROW_HEIGHT }}
              >
                <span className="text-electric-blue">0x{offset.toString(16).padStart(8, '0')}</span>

                <div className="flex flex-wrap gap-1">
                  {hex.map((value, byteIndex) => {
                    const isEditing =
                      editingCell?.line === rowIndex && editingCell?.byte === byteIndex;
                    const isSelected =
                      selectedCell?.line === rowIndex && selectedCell?.byte === byteIndex;

                    return isEditing ? (
                      <input
                        key={`${offset}-${byteIndex}`}
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() =>
                          viewMode === 'hex'
                            ? handleHexEdit(rowIndex, byteIndex, editingValue)
                            : handleBinaryEdit(rowIndex, byteIndex, editingValue)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (viewMode === 'hex') {
                              handleHexEdit(rowIndex, byteIndex, editingValue);
                            } else {
                              handleBinaryEdit(rowIndex, byteIndex, editingValue);
                            }
                          }
                        }}
                        className="w-20 bg-carbon-black border border-electric-blue rounded px-1 text-soft-white"
                      />
                    ) : (
                      <button
                        key={`${offset}-${byteIndex}`}
                        type="button"
                        onClick={() => handleCellClick(rowIndex, byteIndex, value)}
                        className={`rounded px-1 text-left transition ${
                          isSelected
                            ? 'bg-electric-blue/20 text-electric-blue'
                            : 'hover:bg-carbon-black'
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>

                <span className="text-alloy-silver tracking-widest">{ascii.join('')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
