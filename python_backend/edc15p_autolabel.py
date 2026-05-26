import struct
import re
import os
import json

def read_uint32(data, offset):
    if offset + 4 > len(data):
        raise ValueError("Attempt to read beyond buffer size")
    return struct.unpack_from("<I", data, offset)[0]

def read_uint16(data, offset):
    """Read 16-bit value for axis IDs"""
    if offset + 2 > len(data):
        return 0
    return struct.unpack_from("<H", data, offset)[0]

def is_valid_pointer(p, file_size):
    # More flexible pointer validation for EDC15P
    # Allow pointers that are within the file bounds and reasonable alignment
    return 0x1000 <= p < file_size and p % 2 == 0

def is_valid_axis_id(axis_id):
    """Check if axis ID is valid based on C# parser logic"""
    id_strip = axis_id // 256
    if id_strip in [0xDB, 0xC0, 0xC1, 0xC2, 0xC4, 0xC5]:
        return True
    if id_strip in [0xE0, 0xE4, 0xE5, 0xE9, 0xEA, 0xEB, 0xEC]:
        return True
    if id_strip in [0xDA, 0xDD, 0xDE, 0xF9, 0xFE, 0xE8]:
        return True
    return False

def is_valid_axis_length(length, axis_id):
    """Check if axis length is valid for given ID"""
    id_strip = axis_id // 256
    if (id_strip & 0xF0) == 0xE0:
        return 0 < length <= 32
    else:
        return 0 < length < 32

def find_code_blocks(data, debug=False):
    """Improved code block detection for EDC15P files"""
    blocks = []
    
    if debug:
        print("🔍 Searching for EDC15P code blocks...")
    
    # For EDC15P, we know the typical address ranges where maps are located
    # Let's use a more targeted approach based on the CSV data
    fallback_blocks = [
        {"start": 0x4C000, "end": 0x60000, "offset": 0},  # Manual transmission maps
        {"start": 0x6C000, "end": 0x80000, "offset": 0},  # Copy/automatic maps
    ]
    
    # Verify these ranges actually contain data
    for block in fallback_blocks:
        if block["end"] <= len(data):
            # Check if this range contains any potential map data
            has_maps = False
            for offset in range(block["start"], min(block["start"] + 0x1000, block["end"]), 2):
                try:
                    axis_id = read_uint16(data, offset)
                    if is_valid_axis_id(axis_id):
                        axis_len = read_uint16(data, offset + 2)
                        if is_valid_axis_length(axis_len, axis_id):
                            has_maps = True
                            break
                except:
                    continue
            
            if has_maps:
                blocks.append(block)
                if debug:
                    print(f"🧩 EDC15P code block confirmed: start={hex(block['start'])}, end={hex(block['end'])}")
    
    if debug:
        print(f"📋 Total EDC15P code blocks found: {len(blocks)}")
    return blocks

def identify_map_type(address, x_len, y_len, x_axis_id=0, y_axis_id=0):
    """
    Comprehensive map identification matching C# logic complexity
    """
    map_length = x_len * y_len
    
    # Driver wish maps - multiple sizes
    if map_length in [384, 286, 256, 240, 216, 192]:
        return "Driver wish"
    
    # Injection duration maps - most common
    if map_length in [570, 480, 390, 360, 200, 180, 160]:
        if x_axis_id // 256 in [0xC5, 0xC4] and y_axis_id // 256 in [0xEC, 0xEA]:
            return "Injection duration"
        return "Injection duration"
    
    # Specific length-based identification
    if map_length == 700:  # 25x14
        return "Launch control map"
    elif map_length == 448:  # SOI maps
        return "Start of injection (SOI)"
    elif map_length == 416:  # Complex multi-type
        x_id_high = x_axis_id // 256
        y_id_high = y_axis_id // 256
        if x_id_high == 0xF9 and y_id_high == 0xDA:
            return "Smoke limiter"
        elif x_id_high == 0xEC and y_id_high == 0xDA:
            return "IQ by MAP limiter"
        elif x_id_high == 0xEC and y_id_high == 0xEA:
            return "N75 duty cycle"
        elif x_id_high == 0xEC and y_id_high in [0xC0, 0xE9]:
            return "EGR map"
        return "Smoke limiter"
    elif map_length == 320:  # Boost maps
        x_id_high = x_axis_id // 256
        y_id_high = y_axis_id // 256
        if x_id_high == 0xEC and y_id_high == 0xDA:
            return "IQ by MAP limiter"
        return "Boost target map"
    elif map_length == 308:  # SOI limiter
        return "SOI limiter (temperature)"
    elif map_length == 128:  # Temperature corrections
        x_id_high = x_axis_id // 256
        y_id_high = y_axis_id // 256
        if x_id_high == 0xEC and y_id_high == 0xC1:
            return "MAF correction by temperature"
        elif x_id_high == 0xEC and y_id_high == 0xC0:
            return "Expected fuel temperature"
        return "Driver wish"
    elif map_length == 144:  # Various
        if x_len == 3 and y_len == 24:
            return "Torque limiter"
        elif x_len == 9 and y_len == 8:
            return "Fuel volume correction map"
        elif x_len == 8 and y_len == 9:
            return "Start IQ"
        return "Fuel correction/Start IQ"
    elif map_length == 64:  # MAF linearization
        if x_len == 32 and y_len == 1:
            return "MAF linearization"
        return "MAF linearization"
    elif map_length == 63:  # 21x3 torque limiter
        return "Torque limiter"
    elif map_length == 60:  # EGR temperature
        return "EGR temperature map"
    elif map_length == 20:  # Pre-glow
        return "Pre-glow map"
    elif map_length == 12:  # Selector
        return "Injector duration selector"
    elif map_length == 8:  # Idle RPM
        return "Idle RPM"
    elif map_length == 4:  # Linearization
        if x_axis_id in [0xEBA2, 0xEBA4, 0xE9BC]:
            return "MAP linearization"
        elif x_axis_id // 256 == 0xC1:
            return "Idle RPM"
        return "MAP linearization"
    elif map_length == 2:  # MAP linearization
        return "MAP linearization"
    elif map_length == 1:  # SVBL
        return "SVBL"
    
    # Fallback to address-based naming
    addr = int(address, 16) if isinstance(address, str) else address
    if 0x4C000 <= addr <= 0x5C000:
        return f"Map_Bank1_{addr:05X}"
    elif 0x6C000 <= addr <= 0x7C000:
        return f"Map_Bank2_{addr:05X}"
    else:
        return f"Map_Unknown_{addr:05X}"

def get_map_unit(map_name):
    """Simplified unit mapping"""
    unit_map = {
        "injection": "degrees", "driver": "mg/stroke", "torque": "mg/stroke",
        "egr": "mg/stroke", "turbo": "mbar", "boost": "mbar", "smoke": "mg/stroke", 
        "soi": "degrees BTDC", "n75": "%", "map": "mbar", "maf": "mg/stroke",
        "temperature": "°C", "start": "mg/stroke", "launch": "mg/stroke",
        "svbl": "mbar", "limiter": "mg/stroke", "linearization": "raw",
        "selector": "index", "idle": "rpm"
    }
    
    name_lower = map_name.lower()
    for key, unit in unit_map.items():
        if key in name_lower:
            return unit
    return "unknown"

def determine_code_block_by_address(address, code_blocks):
    """Determine which code block contains the given address"""
    for i, block in enumerate(code_blocks, 1):
        if block['start'] <= address <= block['end']:
            return i
    return 0  # No code block found

def determine_code_block_name(address, code_blocks):
    """Get descriptive name for code block"""
    block_id = determine_code_block_by_address(address, code_blocks)
    if block_id == 0:
        return "Unknown"
    elif 0x4C000 <= address <= 0x5FFFF:
        return f"codeblock {block_id}, manual"
    elif 0x6C000 <= address <= 0x7FFFF:
        return f"codeblock {block_id}, copy"
    else:
        return f"codeblock {block_id}"

def scan_for_maps_comprehensive_with_orientation_fix(data, code_blocks, max_maps=2000, debug=False):
    """
    EDC15P map scanning with correct dimension handling to match WinOLS/CSV format
    """
    maps = []
    detected_addresses = set()  # Track addresses to prevent duplicates
    file_size = len(data)
    
    if debug:
        print(f"🔍 EDC15P scanning of {hex(file_size)} bytes for maps...")
        print(f"Code blocks available: {[(i+1, hex(cb['start']), hex(cb['end'])) for i, cb in enumerate(code_blocks)]}")
    
    # Start scanning from the first code block
    start_address = 0x4C000 if code_blocks else 0x10000
    
    # Scan every 2 bytes for potential axis headers (like C# CheckMap)
    for t in range(start_address, file_size - 0x100, 2):
        try:
            # Read X-axis ID and length (like C# code)
            xaxisid = read_uint16(data, t)
            if not is_valid_axis_id(xaxisid):
                continue
                
            xaxislen = read_uint16(data, t + 2)
            if not is_valid_axis_length(xaxislen, xaxisid):
                continue
            
            # Calculate positions (matching C# logic exactly)
            x_axis_data_start = t + 4
            x_axis_data_end = x_axis_data_start + (xaxislen * 2)
            
            if x_axis_data_end >= file_size:
                continue
            
            # Check for Y-axis after X-axis data (like C# code)
            y_axis_offset = x_axis_data_end
            if y_axis_offset + 4 >= file_size:
                continue
                
            yaxisid = read_uint16(data, y_axis_offset)
            yaxislen = read_uint16(data, y_axis_offset + 2)
            
            if is_valid_axis_id(yaxisid) and is_valid_axis_length(yaxislen, yaxisid):
                # 3D map found (matching C# logic)
                y_axis_data_start = y_axis_offset + 4
                y_axis_data_end = y_axis_data_start + (yaxislen * 2)
                map_data_start = y_axis_data_end
                map_length = xaxislen * yaxislen * 2
                
                if map_data_start + map_length > file_size:
                    continue
                
                # Check for additional axis (Z-axis) like in C# code
                zaxisid = read_uint16(data, map_data_start)
                if is_valid_axis_id(zaxisid):
                    zaxislen = read_uint16(data, map_data_start + 2)
                    if is_valid_axis_length(zaxislen, zaxisid):
                        # Skip additional axis structure
                        len2skip = 4 + zaxislen * 2
                        if len2skip < 16:
                            len2skip = 16
                        map_data_start += len2skip
                
                # Skip if we already have a map at this address
                if map_data_start in detected_addresses:
                    continue
                
                code_block_id = determine_code_block_by_address(map_data_start, code_blocks)
                
                # Store dimensions in CSV/WinOLS format based on the debug scan findings
                # The detailed scan shows that CSV expects dimensions swapped from binary format
                csv_x_len = yaxislen  # CSV X = binary Y-axis length  
                csv_y_len = xaxislen  # CSV Y = binary X-axis length
                
                map_name = identify_map_type(map_data_start, csv_x_len, csv_y_len, xaxisid, yaxisid)
                map_unit = get_map_unit(map_name)
                
                if debug and len(maps) < 20:
                    print(f"✅ 3D {map_name} at {hex(t)}: Binary={xaxislen}x{yaxislen} -> CSV={csv_x_len}x{csv_y_len}, data at {hex(map_data_start)}")
                
                # Store with CSV/WinOLS-compatible dimension format
                maps.append({
                    "x_axis_offset": x_axis_data_start,
                    "y_axis_offset": y_axis_data_start,
                    "data_offset": map_data_start,
                    "x_len": csv_x_len,     # CSV/WinOLS X (columns)
                    "y_len": csv_y_len,     # CSV/WinOLS Y (rows)
                    "binary_x_len": xaxislen,  # Raw binary X-axis length
                    "binary_y_len": yaxislen,  # Raw binary Y-axis length
                    "x_axis_id": xaxisid,
                    "y_axis_id": yaxisid,
                    "label": map_name,
                    "type": "3D",
                    "unit": map_unit,
                    "description": f"3D map at {hex(t)}",
                    "address": hex(map_data_start),
                    "length": [csv_y_len, csv_x_len],  # [rows, cols] format
                    "code_block": code_block_id,
                    "code_block_name": determine_code_block_name(map_data_start, code_blocks)
                })
                
                # Mark this address as detected
                detected_addresses.add(map_data_start)
                
            else:
                # 2D map (1D axis + data) - matching C# logic
                map_data_start = x_axis_data_end
                map_length = xaxislen * 2
                
                if map_data_start + map_length > file_size:
                    continue
                
                # Skip if we already have a map at this address (probably a 3D map)
                if map_data_start in detected_addresses:
                    continue
                
                code_block_id = determine_code_block_by_address(map_data_start, code_blocks)
                map_name = identify_map_type(map_data_start, xaxislen, 1, xaxisid, 0)
                map_unit = get_map_unit(map_name)
                
                if debug and len(maps) < 10:
                    print(f"✅ 2D {map_name} at {hex(t)}: {xaxislen}x1, data at {hex(map_data_start)}")
                
                maps.append({
                    "x_axis_offset": x_axis_data_start,
                    "y_axis_offset": 0,
                    "data_offset": map_data_start,
                    "x_len": xaxislen,
                    "y_len": 1,
                    "binary_x_len": xaxislen,
                    "binary_y_len": 1,
                    "x_axis_id": xaxisid,
                    "y_axis_id": 0,
                    "label": map_name,
                    "type": "2D",
                    "unit": map_unit,
                    "description": f"2D map at {hex(t)}",
                    "address": hex(map_data_start),
                    "length": [1, xaxislen],
                    "code_block": code_block_id,
                    "code_block_name": determine_code_block_name(map_data_start, code_blocks)
                })
                
                # Mark this address as detected
                detected_addresses.add(map_data_start)
            
            if len(maps) >= max_maps:
                if debug:
                    print(f"⚠️ Reached maximum map limit of {max_maps}, stopping scan")
                break
                
        except (IndexError, ValueError):
            continue
    
    if debug:
        print(f"📊 EDC15P scan complete: found {len(maps)} total maps")
        
    return maps

if __name__ == "__main__":
    import sys
    bin_path = sys.argv[1] if len(sys.argv) > 1 else "Audi_A3_ASZ_ori.bin"
    debug_mode = "--debug" in sys.argv
    
    with open(bin_path, "rb") as f:
        bin_data = f.read()

    # Always find code blocks for proper map categorization
    code_blocks = find_code_blocks(bin_data, debug=debug_mode)
    if debug_mode and code_blocks:
        print(f"\n🔧 Found {len(code_blocks)} code blocks for map categorization")
    
    # Use enhanced comprehensive map scanning approach
    maps = scan_for_maps_comprehensive_with_orientation_fix(bin_data, code_blocks, max_maps=2000, debug=debug_mode)

    if debug_mode:
        print(f"\nℹ️ Debug mode: {len(maps)} maps detected across {len(code_blocks)} code blocks")
        print("Run without --debug to generate maps.json file")
    else:
        # Group maps by code block - ENHANCED JSON GENERATION FIX
        code_blocks_with_maps = []
        for i, block in enumerate(code_blocks):
            block_id = i + 1
            block_maps = [m for m in maps if m["code_block"] == block_id]
            
            # Determine block type based on address range
            block_type = "manual" if 0x4C000 <= block['start'] <= 0x5FFFF else "copy" if 0x6C000 <= block['start'] <= 0x7FFFF else "unknown"
            
            # Enhanced validation and map processing
            valid_maps = []
            for m in block_maps:
                try:
                    # Comprehensive field validation
                    required_fields = ["label", "address", "length", "type", "unit", "description", "x_axis_offset", "y_axis_offset", "x_len", "y_len"]
                    
                    # Check if ALL required fields exist AND have valid values
                    if all(field in m and m[field] is not None for field in required_fields):
                        # Additional type checking
                        if (isinstance(m["label"], str) and 
                            isinstance(m["address"], str) and 
                            isinstance(m["length"], list) and 
                            isinstance(m["x_len"], int) and 
                            isinstance(m["y_len"], int)):
                            
                            valid_maps.append({
                                "name": m["label"],
                                "address": m["address"],
                                "length": m["length"],
                                "type": m["type"],
                                "unit": m["unit"],
                                "description": m["description"],
                                "x_axis_offset": hex(m["x_axis_offset"]) if isinstance(m["x_axis_offset"], int) else "0x000000",
                                "y_axis_offset": hex(m["y_axis_offset"]) if isinstance(m["y_axis_offset"], int) and m["y_axis_offset"] > 0 else "0x000000",
                                "x_len": m["x_len"],
                                "y_len": m["y_len"]
                            })
                        else:
                            if debug_mode:
                                print(f"⚠️ Map at {m.get('address', 'unknown')} has invalid field types")
                    else:
                        missing_fields = [field for field in required_fields if field not in m or m[field] is None]
                        if debug_mode:
                            print(f"⚠️ Map at {m.get('address', 'unknown')} missing fields: {missing_fields}")
                            
                except Exception as e:
                    if debug_mode:
                        print(f"⚠️ Error processing map: {e}")
                    continue
            
            code_blocks_with_maps.append({
                "id": block_id,
                "start_address": hex(block['start']),
                "end_address": hex(block['end']),
                "length": hex(block['end'] - block['start']),
                "type": block_type,
                "map_count": len(valid_maps),
                "maps": valid_maps
            })
        
        # Enhanced orphaned maps processing
        orphaned_maps = [m for m in maps if m.get("code_block", 0) == 0]
        if orphaned_maps:
            valid_orphaned = []
            for m in orphaned_maps:
                try:
                    required_fields = ["label", "address", "length", "type", "unit", "description", "x_axis_offset", "y_axis_offset", "x_len", "y_len"]
                    if all(field in m and m[field] is not None for field in required_fields):
                        valid_orphaned.append({
                            "name": m["label"],
                            "address": m["address"],
                            "length": m["length"],
                            "type": m["type"],
                            "unit": m["unit"],
                            "description": m["description"],
                            "x_axis_offset": hex(m["x_axis_offset"]) if isinstance(m["x_axis_offset"], int) else "0x000000",
                            "y_axis_offset": hex(m["y_axis_offset"]) if isinstance(m["y_axis_offset"], int) and m["y_axis_offset"] > 0 else "0x000000",
                            "x_len": m["x_len"],
                            "y_len": m["y_len"]
                        })
                except:
                    continue
                    
            if valid_orphaned:
                code_blocks_with_maps.append({
                    "id": 0,
                    "start_address": "0x000000",
                    "end_address": "0x000000", 
                    "length": "0x000000",
                    "type": "orphaned",
                    "map_count": len(valid_orphaned),
                    "maps": valid_orphaned
                })

        # Final validation before JSON generation
        total_valid_maps = sum(block["map_count"] for block in code_blocks_with_maps)
        
        maps_json = {
            "map_pack_name": "EDC15P Auto-detected Maps",
            "base_address": hex(code_blocks[0]['start']) if code_blocks else "0x000000",
            "total_maps": total_valid_maps,  # Use validated count
            "code_blocks": code_blocks_with_maps
        }

        output_path = sys.argv[2] if len(sys.argv) > 2 else "maps.json"

        with open(output_path, "w") as f:
            json.dump(maps_json, f, indent=2)

        print(f"\n✅ maps.json written to {output_path} with {total_valid_maps} valid maps across {len(code_blocks)} code blocks")
        
        # Report any data loss
        if total_valid_maps < len(maps):
            lost_maps = len(maps) - total_valid_maps
            print(f"⚠️ {lost_maps} maps were excluded due to missing/invalid data")