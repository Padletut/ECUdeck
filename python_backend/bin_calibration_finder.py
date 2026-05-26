#!/usr/bin/env python3
"""
Binary Calibration ID Finder for ECU files
Searches for common calibration ID patterns in binary files
"""

import sys
import re
import os
from pathlib import Path

def find_calibration_ids(file_path):
    """Find calibration IDs in binary file"""
    print(f"Reading file: {file_path}")
    
    try:
        with open(file_path, 'rb') as f:
            data = f.read()
        
        print(f"File size: {len(data)} bytes")
        
        # Convert to string for pattern matching, ignore decode errors
        text = data.decode('ascii', errors='ignore')
        print(f"Decoded text length: {len(text)} characters")
        
        # Look for the specific calibration ID we expect
        expected_id = "D915A_B303"
        positions = []
        start = 0
        count = 0
        
        while True:
            pos = data.find(expected_id.encode('ascii'), start)
            if pos == -1:
                break
            positions.append(hex(pos))
            start = pos + 1
            count += 1
            if count > 10:  # Limit to first 10 occurrences
                break
        
        print(f"Found '{expected_id}' {count} times at positions: {', '.join(positions)}")
        
        # Common calibration ID patterns
        patterns = [
            (r'[A-Z]\d{3}[A-Z]_[A-Z]\d{3}', 'Pattern: X###X_X###'),
            (r'[A-Z]\d{3}[A-Z]_\d{5}', 'Pattern: X###X_#####'),
            (r'[A-Z]{2}\d{2}[A-Z]_[A-Z]\d{3}', 'Pattern: XX##X_X###'),
            (r'\d{3}[A-Z]_[A-Z]\d{3}', 'Pattern: ###X_X###'),
            (r'[A-Z]{4}\d_[A-Z]\d{3}', 'Pattern: XXXX#_X###'),
        ]
        
        found_ids = set()
        
        for pattern, description in patterns:
            matches = re.findall(pattern, text)
            if matches:
                print(f"Found {len(matches)} matches for {description}: {matches[:5]}")  # Show first 5
                found_ids.update(matches)
        
        # Also search for software version and part number context
        # Look for text around the expected calibration ID
        if expected_id in text:
            pos = text.find(expected_id)
            context_start = max(0, pos - 50)
            context_end = min(len(text), pos + 50)
            context = text[context_start:context_end]
            print(f"\nContext around '{expected_id}':")
            print(repr(context))
        
        return sorted(found_ids)
        
    except Exception as e:
        print(f"Error reading file: {e}")
        return []

def hex_dump_around_position(file_path, position, context=64):
    """Show hex dump around a specific position"""
    try:
        with open(file_path, 'rb') as f:
            f.seek(max(0, position - context))
            data = f.read(context * 2)
            
        print(f"\nHex dump around position {hex(position)}:")
        for i in range(0, len(data), 16):
            line = data[i:i+16]
            offset = max(0, position - context) + i
            hex_part = ' '.join(f'{b:02x}' for b in line)
            ascii_part = ''.join(chr(b) if 32 <= b <= 126 else '.' for b in line)
            print(f"{offset:08x}: {hex_part:<48} {ascii_part}")
            
    except Exception as e:
        print(f"Error in hex dump: {e}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 bin_calibration_finder.py <binary_file>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not Path(file_path).exists():
        print(f"File not found: {file_path}")
        sys.exit(1)
    
    print(f"Searching for calibration IDs in: {file_path}")
    print("-" * 60)
    
    calibration_ids = find_calibration_ids(file_path)
    
    print(f"\nSummary:")
    if calibration_ids:
        print("Found calibration IDs:")
        for cal_id in calibration_ids:
            print(f"  - {cal_id}")
    else:
        print("No calibration IDs found with standard patterns")
    
    # Show hex dump around the expected calibration ID
    expected_id = "D915A_B303"
    try:
        with open(file_path, 'rb') as f:
            data = f.read()
        
        pos = data.find(expected_id.encode('ascii'))
        if pos != -1:
            hex_dump_around_position(file_path, pos)
    except Exception as e:
        print(f"Error finding position: {e}")

if __name__ == "__main__":
    main()