import { useCallback, useEffect, useRef, useState } from 'react';

export interface HexViewerSelection {
  offset: number;
  endOffset: number;
  byteLength: number;
  displayValue: string;
  viewMode: 'hex' | 'binary';
  bitWidth: 8 | 16 | 32;
}

interface HexViewerProps {
  data: Uint8Array;
  onDataChange?: (newData: Uint8Array) => void;
  onInsertSelection?: (selection: HexViewerSelection) => void;
}

export default function HexViewer({ data, onDataChange, onInsertSelection }: HexViewerProps) {
  const [editableData, setEditableData] = useState(new Uint8Array(data));
  const [editingCell, setEditingCell] = useState<{ line: number; byte: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [currentAddress, setCurrentAddress] = useState(0);
  const [addressInput, setAddressInput] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ line: number; byte: number } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewMode, setViewMode] = useState<'hex' | 'binary'>('hex');
  const [bitWidth, setBitWidth] = useState<8 | 16 | 32>(8);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const ROWS_PER_SCREEN = 20;
  const ROW_HEIGHT = 28;
  const HEX_BYTES_PER_ROW = 16;
  const BINARY_BYTES_PER_ROW = 8;

  useEffect(() => {
    setEditableData(new Uint8Array(data));
    setEditingCell(null);
    setEditingValue('');
    setSelectedCell(null);
  }, [data]);

  const bytesPerRow = viewMode === 'hex' ? HEX_BYTES_PER_ROW : BINARY_BYTES_PER_ROW;
  const totalRows = Math.ceil(editableData.length / bytesPerRow);
  const startRow = Math.floor(scrollTop / ROW_HEIGHT);
  const endRow = Math.min(startRow + ROWS_PER_SCREEN + 5, totalRows);
  const isBinaryView = viewMode === 'binary';
  const bytesPerCell = viewMode === 'hex' ? 1 : bitWidth / 8;
  const cellsPerRow = Math.ceil(bytesPerRow / bytesPerCell);
  const cellWidthInCh = viewMode === 'hex' ? 2 : bitWidth;
  const cellGapInCh = viewMode === 'hex' ? 1 : 1;
  const hexColumnWidthInCh =
    cellsPerRow * cellWidthInCh + Math.max(0, cellsPerRow - 1) * cellGapInCh;
  const asciiColumnWidthInCh = Math.max(bytesPerRow, 8);

  const visibleLines: Array<{ offset: number; hex: string[]; ascii: string[]; rowIndex: number }> =
    [];
  for (let rowIdx = startRow; rowIdx < endRow; rowIdx++) {
    const offset = rowIdx * bytesPerRow;
    const chunk = editableData.slice(offset, offset + bytesPerRow);
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

      const absoluteByteIndex = row * bytesPerRow + byte;
      const updatedData = new Uint8Array(editableData);
      updatedData[absoluteByteIndex] = parseInt(value, 16);

      setEditableData(updatedData);
      onDataChange?.(updatedData);
      setEditingCell(null);
      setEditingValue('');
    },
    [bytesPerRow, editableData, onDataChange],
  );

  const handleBinaryEdit = useCallback(
    (row: number, chunkIndex: number, value: string) => {
      if (!/^[01]+$/.test(value) || ![8, 16, 32].includes(value.length)) {
        return;
      }

      const absoluteByteIndex = row * bytesPerRow + chunkIndex * (value.length / 8);
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
    [bytesPerRow, editableData, onDataChange],
  );

  const handleCellClick = (row: number, byte: number, currentValue: string) => {
    setEditingCell({ line: row, byte });
    setEditingValue(currentValue);
    setSelectedCell({ line: row, byte });
  };

  const emitInsertSelection = useCallback(
    (row: number, byte: number, currentValue: string) => {
      if (!onInsertSelection) {
        return;
      }

      const offset = row * bytesPerRow + byte * bytesPerCell;
      const byteLength = bytesPerCell;

      onInsertSelection({
        offset,
        endOffset: Math.min(editableData.length - 1, offset + byteLength - 1),
        byteLength,
        displayValue: currentValue,
        viewMode,
        bitWidth,
      });
      setCurrentAddress(offset);
    },
    [bitWidth, bytesPerCell, bytesPerRow, editableData.length, onInsertSelection, viewMode],
  );

  const handleAddressJump = () => {
    const address = parseInt(addressInput, 16);
    if (!Number.isNaN(address) && address >= 0 && address < editableData.length) {
      setCurrentAddress(address);
      const targetRow = Math.floor(address / bytesPerRow);
      const newScrollTop = targetRow * ROW_HEIGHT;
      setScrollTop(newScrollTop);

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = newScrollTop;
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

      <div
        ref={scrollContainerRef}
        className="h-[600px] overflow-x-hidden overflow-y-auto"
        onScroll={handleScroll}
        onKeyDown={(event) => {
          if (event.key !== 'Insert' || !selectedCell || editingCell || !onInsertSelection) {
            return;
          }

          event.preventDefault();

          const selectionValue = buildCellDisplayValue(
            editableData,
            selectedCell.line,
            selectedCell.byte,
            bytesPerRow,
            viewMode,
            bitWidth,
          );

          emitInsertSelection(selectedCell.line, selectedCell.byte, selectionValue);
        }}
        tabIndex={0}
      >
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
                className={`grid items-center gap-3 border-b border-gridlines-grey/50 px-4 font-mono ${
                  isBinaryView ? 'text-[12px]' : 'text-[12px]'
                }`}
                style={{
                  gridTemplateColumns: isBinaryView
                    ? `10ch minmax(${hexColumnWidthInCh}ch, 1fr) ${asciiColumnWidthInCh}ch`
                    : '10ch minmax(0,1fr) 14ch',
                  height: ROW_HEIGHT,
                }}
              >
                <span className="whitespace-nowrap text-electric-blue">
                  0x{offset.toString(16).padStart(8, '0')}
                </span>

                <div
                  className="grid min-w-0 items-center whitespace-nowrap"
                  style={{
                    columnGap: isBinaryView ? '0.5rem' : '0.35rem',
                    gridTemplateColumns: isBinaryView
                      ? `repeat(${hex.length}, minmax(${cellWidthInCh}ch, 1fr))`
                      : `repeat(${hex.length}, minmax(0, 1fr))`,
                  }}
                >
                  {hex.map((value, byteIndex) => {
                    const isEditing =
                      editingCell?.line === rowIndex && editingCell?.byte === byteIndex;
                    const isSelected =
                      selectedCell?.line === rowIndex && selectedCell?.byte === byteIndex;
                    const cellWidth = '100%';

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
                          } else if (e.key === 'Insert') {
                            e.preventDefault();
                            emitInsertSelection(rowIndex, byteIndex, editingValue);
                          }
                        }}
                        className="h-6 min-w-0 rounded border border-electric-blue bg-carbon-black px-0.5 text-center leading-none text-soft-white outline-none"
                        style={{ width: cellWidth }}
                      />
                    ) : (
                      <button
                        key={`${offset}-${byteIndex}`}
                        type="button"
                        onClick={() => handleCellClick(rowIndex, byteIndex, value)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Insert') {
                            return;
                          }

                          event.preventDefault();
                          emitInsertSelection(rowIndex, byteIndex, value);
                        }}
                        className={`flex h-6 min-w-0 items-center justify-center rounded leading-none transition ${
                          isSelected
                            ? 'bg-electric-blue/20 text-electric-blue'
                            : 'hover:bg-carbon-black'
                        }`}
                        style={{ width: cellWidth }}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>

                <span className="whitespace-pre text-alloy-silver">{ascii.join('')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildCellDisplayValue(
  data: Uint8Array,
  row: number,
  byte: number,
  bytesPerRow: number,
  viewMode: 'hex' | 'binary',
  bitWidth: 8 | 16 | 32,
): string {
  const offset = row * bytesPerRow;

  if (viewMode === 'hex') {
    return data[offset + byte]?.toString(16).padStart(2, '0') ?? '00';
  }

  const bytesPerCell = bitWidth / 8;
  const startIndex = offset + byte * bytesPerCell;
  const chunk = data.slice(startIndex, startIndex + bytesPerCell);

  if (bitWidth === 8) {
    return chunk[0]?.toString(2).padStart(8, '0') ?? '00000000';
  }

  if (bitWidth === 16) {
    const value = (chunk[0] ?? 0) | ((chunk[1] ?? 0) << 8);
    return value.toString(2).padStart(16, '0');
  }

  const value =
    (chunk[0] ?? 0) | ((chunk[1] ?? 0) << 8) | ((chunk[2] ?? 0) << 16) | ((chunk[3] ?? 0) << 24);
  return (value >>> 0).toString(2).padStart(32, '0');
}
