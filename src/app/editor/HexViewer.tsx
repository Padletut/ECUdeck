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

  const ROWS_PER_SCREEN = 20; // Only render 20 rows at a time
  const ROW_HEIGHT = 24; // Height of each row in pixels
  const BYTES_PER_ROW = 16;

  const totalRows = Math.ceil(editableData.length / BYTES_PER_ROW);
  const startRow = Math.floor(scrollTop / ROW_HEIGHT);
  const endRow = Math.min(startRow + ROWS_PER_SCREEN + 5, totalRows); // +5 for buffer

  // Only generate visible lines
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
        // Binary view
        if (bitWidth === 8) {
          hex = Array.from(chunk).map((b) => b.toString(2).padStart(8, '0'));
        } else if (bitWidth === 16) {
          // Group bytes into 16-bit values (little-endian)
          for (let i = 0; i < chunk.length; i += 2) {
            if (i + 1 < chunk.length) {
              const value = chunk[i] | (chunk[i + 1] << 8);
              hex.push(value.toString(2).padStart(16, '0'));
            } else {
              // Handle odd byte
              hex.push(chunk[i].toString(2).padStart(8, '0'));
            }
          }
        } else if (bitWidth === 32) {
          // Group bytes into 32-bit values (little-endian)
          for (let i = 0; i < chunk.length; i += 4) {
            if (i + 3 < chunk.length) {
              const value =
                chunk[i] | (chunk[i + 1] << 8) | (chunk[i + 2] << 16) | (chunk[i + 3] << 24);
              hex.push((value >>> 0).toString(2).padStart(32, '0')); // >>> 0 for unsigned
            } else {
              // Handle remaining bytes as smaller groups
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

  // ...existing code...

  const handleHexEdit = useCallback(
    (lineIndex: number, byteIndex: number, newValue: string) => {
      if (viewMode === 'hex') {
        const hexValue = newValue.replace(/[^0-9a-fA-F]/g, '').slice(0, 2);
        if (hexValue.length === 2) {
          const byteValue = parseInt(hexValue, 16);
          if (!isNaN(byteValue)) {
            const newData = new Uint8Array(editableData);
            // Convert visible line index to global byte index
            const globalIndex = (startRow + lineIndex) * BYTES_PER_ROW + byteIndex;
            if (globalIndex < newData.length) {
              newData[globalIndex] = byteValue;
              setEditableData(newData);
              onDataChange?.(newData);
            }
          }
        }
      } else {
        // Binary mode
        const binaryValue = newValue.replace(/[^01]/g, '');
        if (bitWidth === 8 && binaryValue.length === 8) {
          const byteValue = parseInt(binaryValue, 2);
          if (!isNaN(byteValue)) {
            const newData = new Uint8Array(editableData);
            const globalIndex = (startRow + lineIndex) * BYTES_PER_ROW + byteIndex;
            if (globalIndex < newData.length) {
              newData[globalIndex] = byteValue;
              setEditableData(newData);
              onDataChange?.(newData);
            }
          }
        }
        // Note: 16-bit and 32-bit editing would require more complex logic
        // For now, only support 8-bit binary editing
      }
    },
    [editableData, onDataChange, startRow, viewMode, bitWidth],
  );

  const startEditing = (lineIndex: number, byteIndex: number) => {
    const currentHex = visibleLines[lineIndex]?.hex[byteIndex] || '00';
    setEditingCell({ line: lineIndex, byte: byteIndex });
    setEditingValue(currentHex.toUpperCase());
  };

  const confirmEdit = () => {
    if (editingCell) {
      handleHexEdit(editingCell.line, editingCell.byte, editingValue);
    }
    setEditingCell(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) {
      // Handle editing mode
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        confirmEdit();

        // Move to next cell and start editing after confirming edit
        if (e.key === 'Tab') {
          moveToNextCellAndEdit(e.shiftKey);
        }
      } else if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        confirmEdit();

        // Move in the direction and start editing
        if (e.key === 'ArrowUp') {
          moveInDirectionAndEdit('up');
        } else if (e.key === 'ArrowDown') {
          moveInDirectionAndEdit('down');
        } else if (e.key === 'ArrowLeft') {
          moveToNextCellAndEdit(true);
        } else if (e.key === 'ArrowRight') {
          moveToNextCellAndEdit(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    } else if (selectedCell) {
      // Handle navigation mode
      e.preventDefault();

      if (e.key === 'Enter' || e.key === ' ') {
        startEditing(selectedCell.line, selectedCell.byte);
      } else if (e.key === 'Tab') {
        moveToNextCell(e.shiftKey);
      } else if (e.key === 'ArrowUp') {
        if (selectedCell.line > 0) {
          moveCell(selectedCell.line - 1, selectedCell.byte);
        } else {
          // At top of visible area, scroll up
          const newRow = Math.max(0, startRow - 1);
          scrollToRow(newRow);
          setSelectedCell({ line: 0, byte: selectedCell.byte });
        }
      } else if (e.key === 'ArrowDown') {
        if (selectedCell.line < visibleLines.length - 1) {
          moveCell(selectedCell.line + 1, selectedCell.byte);
        } else {
          // At bottom of visible area, scroll down
          const newRow = Math.min(totalRows - ROWS_PER_SCREEN, startRow + 1);
          scrollToRow(newRow);
          setSelectedCell({
            line: Math.min(ROWS_PER_SCREEN - 1, visibleLines.length - 1),
            byte: selectedCell.byte,
          });
        }
      } else if (e.key === 'ArrowLeft') {
        moveToNextCell(true); // Move backward
      } else if (e.key === 'ArrowRight') {
        moveToNextCell(false); // Move forward
      }
    }
  };

  const moveCell = (newLine: number, newByte: number) => {
    // Clamp to visible lines bounds
    const clampedLine = Math.max(0, Math.min(newLine, visibleLines.length - 1));
    const lineLength = visibleLines[clampedLine]?.hex.length || 0;
    const clampedByte = Math.max(0, Math.min(newByte, lineLength - 1));

    if (visibleLines[clampedLine]) {
      setSelectedCell({ line: clampedLine, byte: clampedByte });
    }
  };

  const moveToNextCell = (backward: boolean = false) => {
    if (!selectedCell) {
      setSelectedCell({ line: 0, byte: 0 });
      return;
    }

    const { line, byte } = selectedCell;
    const currentLineLength = visibleLines[line]?.hex.length || BYTES_PER_ROW;

    if (backward) {
      // Move backward
      if (byte > 0) {
        moveCell(line, byte - 1);
      } else if (line > 0) {
        const prevLineLength = visibleLines[line - 1]?.hex.length || BYTES_PER_ROW;
        moveCell(line - 1, prevLineLength - 1);
      } else {
        // At first cell, try to scroll up
        scrollToRow(Math.max(0, startRow - 1));
      }
    } else {
      // Move forward
      if (byte < currentLineLength - 1) {
        moveCell(line, byte + 1);
      } else if (line < visibleLines.length - 1) {
        moveCell(line + 1, 0);
      } else {
        // At last visible cell, try to scroll down
        scrollToRow(Math.min(totalRows - 1, startRow + 1));
      }
    }
  };

  const scrollToRow = (targetRow: number) => {
    const newScrollTop = targetRow * ROW_HEIGHT;
    const scrollContainer = document.querySelector('.overflow-auto') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.scrollTop = newScrollTop;
    }
    setScrollTop(newScrollTop);
  };

  const moveToNextCellAndEdit = (backward: boolean = false) => {
    if (!selectedCell) {
      setSelectedCell({ line: 0, byte: 0 });
      startEditing(0, 0);
      return;
    }

    const { line, byte } = selectedCell;
    const currentLineLength = visibleLines[line]?.hex.length || BYTES_PER_ROW;

    if (backward) {
      // Move backward
      if (byte > 0) {
        const newLine = line;
        const newByte = byte - 1;
        setSelectedCell({ line: newLine, byte: newByte });
        startEditing(newLine, newByte);
      } else if (line > 0) {
        const newLine = line - 1;
        const newByte = (visibleLines[newLine]?.hex.length || BYTES_PER_ROW) - 1;
        setSelectedCell({ line: newLine, byte: newByte });
        startEditing(newLine, newByte);
      } else {
        // At first cell, try to scroll up
        const newRow = Math.max(0, startRow - 1);
        scrollToRow(newRow);
        setTimeout(() => {
          setSelectedCell({ line: 0, byte: BYTES_PER_ROW - 1 });
          startEditing(0, BYTES_PER_ROW - 1);
        }, 50);
      }
    } else {
      // Move forward
      if (byte < currentLineLength - 1) {
        const newLine = line;
        const newByte = byte + 1;
        setSelectedCell({ line: newLine, byte: newByte });
        startEditing(newLine, newByte);
      } else if (line < visibleLines.length - 1) {
        const newLine = line + 1;
        const newByte = 0;
        setSelectedCell({ line: newLine, byte: newByte });
        startEditing(newLine, newByte);
      } else {
        // At last visible cell, try to scroll down
        const newRow = Math.min(totalRows - 1, startRow + 1);
        scrollToRow(newRow);
        setTimeout(() => {
          const targetLine = Math.min(ROWS_PER_SCREEN - 1, visibleLines.length - 1);
          setSelectedCell({ line: targetLine, byte: 0 });
          startEditing(targetLine, 0);
        }, 50);
      }
    }
  };

  const moveInDirectionAndEdit = (direction: 'up' | 'down') => {
    if (!selectedCell) return;

    const { line, byte } = selectedCell;

    if (direction === 'up') {
      if (line > 0) {
        const newLine = line - 1;
        setSelectedCell({ line: newLine, byte });
        startEditing(newLine, byte);
      } else {
        // At top of visible area, scroll up
        const newRow = Math.max(0, startRow - 1);
        scrollToRow(newRow);
        setTimeout(() => {
          setSelectedCell({ line: 0, byte });
          startEditing(0, byte);
        }, 50);
      }
    } else {
      if (line < visibleLines.length - 1) {
        const newLine = line + 1;
        setSelectedCell({ line: newLine, byte });
        startEditing(newLine, byte);
      } else {
        // At bottom of visible area, scroll down
        const newRow = Math.min(totalRows - ROWS_PER_SCREEN, startRow + 1);
        scrollToRow(newRow);
        setTimeout(() => {
          const targetLine = Math.min(ROWS_PER_SCREEN - 1, visibleLines.length - 1);
          setSelectedCell({ line: targetLine, byte });
          startEditing(targetLine, byte);
        }, 50);
      }
    }
  };

  const handleAddressJump = () => {
    const address = parseInt(addressInput.replace('0x', ''), 16);
    if (!isNaN(address) && address >= 0 && address < editableData.length) {
      setCurrentAddress(address);
      // Calculate which row this address is on and scroll to it
      const row = Math.floor(address / BYTES_PER_ROW);
      const newScrollTop = row * ROW_HEIGHT;

      // Find the scrollable container and scroll it
      const scrollContainer = document.querySelector('.overflow-auto') as HTMLElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = newScrollTop;
      }

      // Update scroll state
      setScrollTop(newScrollTop);

      // Set the selected cell to this address
      const byteIndex = address % BYTES_PER_ROW;
      const visibleRowIndex = 0; // Will be at top of visible area
      setSelectedCell({ line: visibleRowIndex, byte: byteIndex });
    } else {
      // Show error for invalid address
      const maxAddress = editableData.length - 1;
      alert(
        `Invalid address! Please enter an address between 0x0000 and 0x${maxAddress.toString(16).toUpperCase()} (${editableData.length} bytes total).`,
      );
      // Reset input to current address or 0
      setAddressInput(`0x${currentAddress.toString(16).toUpperCase()}`);
    }
  };

  const analyzeECUData = (data: Uint8Array) => {
    const analysis = {
      totalSize: data.length,
      nonEmptyRegions: [] as { start: number; end: number; description: string }[],
      ecuInfo: null as { version: string; identifier: string; offset: number } | null,
      firmwareStartAddress: null as number | null,
    };

    for (let i = 0; i < data.length - 20; i++) {
      const slice = data.slice(i, i + 20);
      const text = Array.from(slice)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('');

      if (text.match(/[A-Z]{2,4}\s+V\d+\.\d+/)) {
        const fullText = Array.from(data.slice(i, i + 50))
          .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ''))
          .join('')
          .trim();

        analysis.ecuInfo = {
          version: fullText,
          identifier: fullText.split(' ').slice(0, 2).join(' '),
          offset: i,
        };

        const sectorSize = 0x8000;
        analysis.firmwareStartAddress = Math.floor(i / sectorSize) * sectorSize;
        break;
      }
    }

    if (!analysis.firmwareStartAddress) {
      let consecutiveNonEmpty = 0;
      for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        const isEmpty = byte === 0xc3 || byte === 0xff || byte === 0x00;

        if (!isEmpty) {
          consecutiveNonEmpty++;
          if (consecutiveNonEmpty >= 1024) {
            analysis.firmwareStartAddress = i - 1023;
            break;
          }
        } else {
          consecutiveNonEmpty = 0;
        }
      }
    }

    let regionStart = -1;
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      const isEmpty = byte === 0xc3 || byte === 0xff || byte === 0x00;

      if (!isEmpty && regionStart === -1) {
        regionStart = i;
      } else if (isEmpty && regionStart !== -1) {
        if (i - regionStart > 100) {
          analysis.nonEmptyRegions.push({
            start: regionStart,
            end: i - 1,
            description: `Data region (${((i - regionStart) / 1024).toFixed(1)}KB)`,
          });
        }
        regionStart = -1;
      }
    }

    if (regionStart !== -1) {
      analysis.nonEmptyRegions.push({
        start: regionStart,
        end: data.length - 1,
        description: `Data region (${((data.length - regionStart) / 1024).toFixed(1)}KB)`,
      });
    }

    return analysis;
  };

  const analysis = analyzeECUData(data);

  return (
    <div className="bg-carbon-black text-soft-white">
      {analysis.ecuInfo && (
        <div className="mb-4 p-4 bg-steel-grey rounded-lg border border-electric-blue">
          <h3 className="text-electric-blue font-bold mb-2">ECU Firmware Detected</h3>
          <p className="text-sm">
            <span className="text-alloy-silver">Version:</span> {analysis.ecuInfo.version}
          </p>
          <p className="text-sm">
            <span className="text-alloy-silver">Location:</span> 0x
            {analysis.ecuInfo.offset.toString(16).toUpperCase()}
          </p>
          <p className="text-sm">
            <span className="text-alloy-silver">Size:</span>{' '}
            {(analysis.totalSize / 1024).toFixed(1)}KB
          </p>
          {analysis.firmwareStartAddress !== null && (
            <p className="text-sm">
              <span className="text-alloy-silver">Firmware Start:</span> 0x
              {analysis.firmwareStartAddress.toString(16).toUpperCase()}
            </p>
          )}
        </div>
      )}

      {false && analysis.nonEmptyRegions.length > 0 && (
        <div className="mb-4 p-4 bg-steel-grey rounded-lg">
          <h3 className="text-dyno-green font-bold mb-2" style={{ display: 'none' }}>
            Data Regions Found
          </h3>
          {analysis.nonEmptyRegions.map((region, idx) => (
            <div key={idx} className="text-sm mb-1">
              <span className="text-alloy-silver">
                0x{region.start.toString(16).toUpperCase()} - 0x
                {region.end.toString(16).toUpperCase()}:
              </span>
              <span className="ml-2">{region.description}</span>
              <button
                className="ml-2 text-electric-blue hover:underline text-xs"
                onClick={() => setCurrentAddress(region.start)}
              >
                Jump to
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <label className="text-alloy-silver text-sm">Address:</label>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddressJump()}
            className="bg-steel-grey border border-gridlines-grey rounded px-2 py-1 text-sm w-20 text-soft-white"
            placeholder={
              analysis.firmwareStartAddress
                ? `0x${analysis.firmwareStartAddress.toString(16)}`
                : '0x0000'
            }
          />
          <button
            onClick={handleAddressJump}
            className="bg-electric-blue text-carbon-black px-3 py-1 rounded text-sm font-bold hover:bg-blue-400 transition"
          >
            Go
          </button>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center space-x-2 border-l border-gridlines-grey pl-4">
          <label className="text-alloy-silver text-sm">View:</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'hex' | 'binary')}
            className="bg-steel-grey border border-gridlines-grey rounded px-2 py-1 text-sm text-soft-white"
          >
            <option value="hex">Hex</option>
            <option value="binary">Binary</option>
          </select>

          {viewMode === 'binary' && (
            <>
              <label className="text-alloy-silver text-sm">Bits:</label>
              <select
                value={bitWidth}
                onChange={(e) => setBitWidth(parseInt(e.target.value) as 8 | 16 | 32)}
                className="bg-steel-grey border border-gridlines-grey rounded px-2 py-1 text-sm text-soft-white"
              >
                <option value={8}>8-bit</option>
                <option value={16}>16-bit</option>
                <option value={32}>32-bit</option>
              </select>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-alloy-silver text-sm">Quick:</span>
          <button
            onClick={() => {
              setAddressInput('0x0000');
              handleAddressJump();
            }}
            className="text-electric-blue hover:underline text-sm"
          >
            Start
          </button>
          {analysis.firmwareStartAddress !== null && analysis.firmwareStartAddress > 0 && (
            <button
              onClick={() => setCurrentAddress(analysis.firmwareStartAddress!)}
              className="text-electric-blue hover:underline text-sm"
            >
              Firmware (0x{analysis.firmwareStartAddress.toString(16).toUpperCase()})
            </button>
          )}
          {analysis.ecuInfo && (
            <button
              onClick={() => setCurrentAddress(analysis.ecuInfo!.offset)}
              className="text-electric-blue hover:underline text-sm"
            >
              ID String
            </button>
          )}
          <button
            onClick={() => setCurrentAddress(Math.max(0, data.length - 512))}
            className="text-electric-blue hover:underline text-sm"
          >
            End
          </button>
        </div>
      </div>

      <div
        className="overflow-auto font-mono text-sm"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (!selectedCell && visibleLines.length > 0) {
            setSelectedCell({ line: 0, byte: 0 });
          }
        }}
        style={{ height: '400px', position: 'relative' }}
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          setScrollTop(scrollTop);
        }}
      >
        {/* Virtual container with full height */}
        <div style={{ height: `${totalRows * ROW_HEIGHT}px`, position: 'relative' }}>
          {/* Visible content positioned at scroll offset */}
          <div style={{ position: 'absolute', top: `${startRow * ROW_HEIGHT}px`, width: '100%' }}>
            <table className="w-full text-left border-collapse">
              {' '}
              <thead>
                <tr className="text-muted-text">
                  <th className="pr-4">Offset</th>
                  <th className="pr-4">
                    {viewMode === 'hex' ? 'Hex' : `Binary (${bitWidth}-bit)`}
                  </th>
                  <th>ASCII</th>
                </tr>
              </thead>
              <tbody>
                {visibleLines.map(
                  (
                    line: { offset: number; hex: string[]; ascii: string[]; rowIndex: number },
                    lineIdx: number,
                  ) => (
                    <tr key={lineIdx} className="hover:bg-steel-grey/50">
                      <td className="text-alloy-silver pr-4">
                        {'0x' + line.offset.toString(16).padStart(6, '0')}
                      </td>
                      <td className="text-soft-white pr-4">
                        <div className="flex space-x-1">
                          {line.hex.map((hexByte: string, byteIdx: number) => (
                            <span
                              key={byteIdx}
                              className={`cursor-pointer hover:bg-electric-blue/20 px-1 rounded select-none focus:outline-none ${
                                editingCell?.line === lineIdx && editingCell?.byte === byteIdx
                                  ? 'bg-electric-blue/30'
                                  : selectedCell?.line === lineIdx && selectedCell?.byte === byteIdx
                                    ? 'bg-electric-blue/10 ring-1 ring-electric-blue'
                                    : ''
                              }`}
                              onClick={() => {
                                setSelectedCell({ line: lineIdx, byte: byteIdx });
                                startEditing(lineIdx, byteIdx);
                              }}
                              onFocus={() => setSelectedCell({ line: lineIdx, byte: byteIdx })}
                              tabIndex={-1}
                              title="Click to edit • Use arrow keys to navigate • Tab/Shift+Tab to move • Enter/Space to edit"
                            >
                              {editingCell?.line === lineIdx && editingCell?.byte === byteIdx ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => {
                                    let value = '';

                                    if (viewMode === 'hex') {
                                      value = e.target.value
                                        .replace(/[^0-9a-fA-F]/g, '')
                                        .slice(0, 2);
                                    } else {
                                      // Binary mode - only allow 0 and 1
                                      if (bitWidth === 8) {
                                        value = e.target.value.replace(/[^01]/g, '').slice(0, 8);
                                      } else {
                                        // For 16-bit and 32-bit, still edit as 8-bit binary for simplicity
                                        value = e.target.value.replace(/[^01]/g, '').slice(0, 8);
                                      }
                                    }

                                    setEditingValue(value.toUpperCase());
                                  }}
                                  onKeyDown={handleKeyDown}
                                  onBlur={confirmEdit}
                                  className={`${viewMode === 'binary' && bitWidth === 8 ? 'w-16' : 'w-6'} bg-steel-grey text-soft-white text-center outline-none border border-electric-blue rounded`}
                                  autoFocus
                                  maxLength={viewMode === 'hex' ? 2 : bitWidth === 8 ? 8 : 8}
                                  style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                  placeholder={viewMode === 'hex' ? 'FF' : '11111111'}
                                />
                              ) : (
                                hexByte.toUpperCase()
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-muted-text font-mono">{line.ascii.join('')}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-alloy-silver border-t border-gridlines-grey pt-2">
        <p>
          Click on {viewMode} values to edit • Use arrow keys to navigate • Tab/Shift+Tab to move
          between cells • Enter/Space to edit • ESC to cancel
        </p>
        <p>
          Data size: {editableData.length} bytes • View:{' '}
          {viewMode === 'hex' ? 'Hexadecimal' : `Binary (${bitWidth}-bit)`}
        </p>
      </div>
    </div>
  );
}
