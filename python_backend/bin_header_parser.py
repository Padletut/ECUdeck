import re
import os
from pathlib import Path

# =============================================================================
# REGEX PATTERN CONSTANTS - Edit these to modify ECU detection behavior
# =============================================================================

# ECU Type Detection Patterns
ECU_DETECTION_PATTERNS = {
    # Gasoline ECU patterns (most specific first)
    "MED9_SPECIFIC": [
        r"\bMED9[0-9]\.[0-9]\.[0-9]\b",  # MED9.1.1 format
        r"\bMED9[0-9]\.[0-9]\b",         # MED9.1 format  
        r"\bMED9[0-9]\b",                # MED91 format
    ],
    "MED9_GENERAL": r"\b(MED9|TFSI|FSI)\b",
    "ME7": r"\b(MED7|ME7)\b",
    
    # BMW/Filename detection patterns
    "BMW_MSA15": r"\b(MSA15|E30|E34)\b",  # MSA15 specific
    "BMW_MOTRONIC": r"\b(BMW|E36)\b",
    "BMW_ME7": r"\b(E46|E39|E38)\b",
    "BOSCH_MSA15": r"0261[1-2]\d{5}",    # Very old Bosch pattern for MSA15
    "BOSCH_MOTRONIC": r"0261[1-3]\d{5}",
    "BOSCH_ME7": r"0261[4-6]\d{5}",
    
    # BMW in strings
    "BMW_IN_STRINGS": r"\b(BMW|E30|E34|E36|E46|E39|E38)\b",
    "MSA15_IN_STRINGS": r"\b(MSA15|M20|M30|E30|E34)\b",  # MSA15 specific engines/chassis
    "BMW_BOSCH_NUMBERS": r"\b0261[2-6]\d{5}\b",
    "OLD_BOSCH": r"\b0261[1-3]\d{5}\b",
    "NEWER_BOSCH": r"\b0261[4-6]\d{5}\b",
    
    # SID patterns
    "SID_SPECIFIC": [r"CASN0F71", r"SN0F7"],
    "SID_CONTEXT": r"\b(CASN|SN0F7|7010\d{6})\b",
    
    # Diesel ECU patterns
    "EDC15": r"\b(038906019[A-Z]{2}|045906019[A-Z]{1,3})\b",
    "EDC16": r"\b(038906016[A-Z]|038906018[A-Z]|03G906021[A-Z]?|8E0907401[A-Z]{1,3})\b",
    "EDC17": r"\b(03L906018|04L906056)\b",
    "EDC16_BOSCH": r"\b0281011\d{3}\b",
    "EDC15_BOSCH": r"\b02810[0-9]{5}\b",
    
    # Other manufacturers
    "CONTINENTAL": r"\b(A2C|5WY)\b",
    "DELPHI": r"\b(DCM|DDCR)\b",
    
    # MSA15 specific patterns (check BEFORE EDC15)
    "MSA15_ENGINES": r"\b(D19|D21|D24|M20|M30|S14|S38)\b",  # MSA15 era engines
    "MSA15_VEHICLES": r"\b(E30|E34|80|90|100|200|V8)\b",    # MSA15 era vehicles
    "MSA15_BOSCH_OLD": r"\b0281001\d{3}\b",                 # Very old Bosch numbers (MSA15 era)
}

# Part Number Patterns by ECU Type
PART_NUMBER_PATTERNS = {
    "EDC15": r"\b(038906019[A-Z]{1,3}|045906019[A-Z]{1,3})\b",
    "EDC16_17": r"\b(0[0-9G]{8}[A-Z]{1,3}|8E0907401[A-Z]{1,3})\b",
    "SID": r"\b03G906018\b",
    "MSA15": r"\b(028906021[A-Z]{1,3}|037906019[A-Z]{1,3}|8A0907311[A-Z]{1,3})\b",  # MSA15 specific part numbers
    "MOTRONIC": r"\b[0-9]{8,11}[A-Z]{0,3}\b",
    "GASOLINE_MODERN": r"\b[0-9][A-Z][0-9]{7}[A-Z]{1,3}\b",
    "BMW_SPECIFIC": r"\b([0-9]{5}[A-Z]{2}[0-9]{4})\b",
    "CONTINENTAL_DELPHI": r"\b[A-Z0-9]{8,12}\b",
    "GENERIC": r"\b[A-Z0-9]{8,15}\b",
}

# Bosch Number Patterns
BOSCH_NUMBER_PATTERNS = {
    "EDC15": r"\b02810[2-9][0-9]{4}\b",  # EDC15 Bosch numbers (later than MSA15)
    "EDC16": r"\b0281011\d{3}\b",
    "MSA15": r"\b(0281001\d{3})\b",      # Very old Bosch patterns - more specific
    "MOTRONIC": r"\b0261[1-3]?\d{5,6}\b",
    "GASOLINE_ALPHA": r"\b0261[A-Z]\d{5}\b",
    "GASOLINE_NUMERIC": r"0261\d{6}",
    "BMW_PATTERNS": [
        r"\b(0261[A-Z]?\d{5,6})\b",
        r"\b(0261[2-6]\d{5})\b",
    ],
    "ENHANCED_SEARCH": [
        r"0261\d{6}",
        r"0261011\d{3}",
        r"0261010\d{3}",
        r"0261012\d{3}",
        r"0261013\d{3}",
    ],
}

# Software Version Patterns
SOFTWARE_VERSION_PATTERNS = {
    "EDC15": r"\b(?:1037)?[0-9]{6}\b",
    "EDC16_17": r"\b1037(\d{6})[A-Z0-9]+\b",
    "SID": r"\b7010\d{6}(?:\.\d{2}\.\d{2})?\b",
    "MSA15": r"\b([0-9]{4,8})\b",         # MSA15 uses simple numeric versions
    "MOTRONIC_SIMPLE": r"\b([0-9]{4,6})\b",
    "GASOLINE_FLEXIBLE": r"\b(?:1037)?(\d{6,10})\b",
    "GASOLINE_PATTERNS": [
        r"\b([0-9]{6})\b",
        r"\b([0-9]{8})\b", 
        r"\b1037([0-9]{6})\b",
    ],
    "GENERIC": r"\b[0-9]{4,10}\b",
}

# Calibration ID Patterns
CALIBRATION_ID_PATTERNS = {
    "EDC16_17": r"\b1037\d{6}([A-Z][0-9][A-Z0-9]{6})\b",
    "SID": r"\bCASN0F71SN0F710\b",
    "MSA15": r"\b([A-Z][0-9]{2,3}|[0-9]{4,8}[A-Z]{0,2})\b",  # MSA15 calibration patterns
    "GASOLINE_PRIMARY": r"\b([A-Z]\d{3}[A-Z]_[A-Z]\d{3})\b",
    "GASOLINE_FALLBACK": [
        r"\b[A-F0-9]{8}\b",
        r"\b[A-Z]{2}\d{6}\b",
        r"\b\d{4}[A-Z]{4}\b",
    ],
    "CONTINENTAL_DELPHI": r"\b[A-F0-9]{16}\b",
    "GENERIC": r"\b[A-F0-9]{8,16}\b",
    "POSITION_BASED": r'[A-Z]\d{3}[A-Z]_[A-Z]\d{3}',
}

# Hardware Version Patterns
HARDWARE_VERSION_PATTERNS = {
    "STANDARD": r"\b[A-Z]\d\.\d\.\d\b",
    "ENHANCED": r"A\d\.\d\.\d+",
    "CAPTURE": r"(A\d\.\d\.\d+)",
}

# TSW Version Patterns
TSW_VERSION_PATTERNS = {
    "EDC15": r"TSW\s+V[\d.]+\s+\d{6}(?:\s+\d{4}\s+[A-Z0-9]{4})?",
    "EDC16_17": r"TSW\s+V[\d.]+",
}

# Siemens Number Patterns
SIEMENS_NUMBER_PATTERNS = [
    r"\b5WP\d{5}[A-Z]{2}\b",  # 5WP45500AF
    r"\b5WP\d{5}[A-Z]\b",     # 5WP45500A
    r"\b5WP\d{5}\b",          # 5WP45500
]

# Dummy Data Detection Patterns
DUMMY_DATA_PATTERNS = [
    r"^0123456789", r"^1234567890", r"^0{6,}$", r"^1{6,}$",
    r"^3{6,}$", r"^ABCDEF", r"^XUXUXU", r"^12345678$",
    r"^DDDDFFFF$", r"^CHECKSUMME$",
    r"^2{8,}$", r"^F{8,}$", r"^5{6,}$",
    r"^4{4,}$", r"^5{4,}$", r"^6{4,}$", r"^7{4,}$", r"^8{4,}$", r"^9{4,}$",
    r"^A{4,}$", r"^B{4,}$", r"^C{4,}$", r"^D{4,}$", r"^E{4,}$", r"^F{4,}$",
    r"^2552222222$", r"^5555555555$", r"^AAAAAAAAAA$",
    r"^(..)\1{3,}$",  # Repeated pairs
    r"^25{5,}$", r"^52{5,}$",  # BMW Motronic specific
]

# Exclusion Patterns (for context filtering)
EXCLUSION_PATTERNS = {
    "HARDWARE_VERSION": ["ERCOSEK", "ETAS", "MMA4"],
}

# Known calibration ID positions for binary extraction
CALIBRATION_ID_POSITIONS = [0x80280, 0x8028a, 0x80294, 0x1c21c0, 0x1c21cc, 0x1c21d8]

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def extract_ascii_strings(filepath, min_length=5):
    with open(filepath, 'rb') as f:
        data = f.read()

    text = data.decode('latin1', errors='ignore')
    return re.findall(rf'[\x20-\x7E]{{{min_length},}}', text)

def search_siemens_number_advanced(filepath, strings):
    """Advanced search for Siemens number using multiple methods"""
    for line in strings:
        for pattern in SIEMENS_NUMBER_PATTERNS:
            match = re.search(pattern, line)
            if match:
                return match.group()
    
    with open(filepath, 'rb') as f:
        data = f.read()
    
    ascii_5wp = b'5WP'
    pos = data.find(ascii_5wp)
    if pos != -1:
        start = max(0, pos)
        end = min(len(data), pos + 12)
        surrounding = data[start:end]
        try:
            decoded = surrounding.decode('latin1', errors='ignore')
            for pattern in SIEMENS_NUMBER_PATTERNS:
                match = re.search(pattern, decoded)
                if match:
                    return match.group()
        except:
            pass
    
    return None

def detect_ecu_type(strings):
    """Detect ECU generation based on patterns in strings"""
    
    # Check for gasoline ECUs first - be more specific with MED9 variants
    for line in strings:
        # Bosch MED9.x variants (most specific first)
        for pattern in ECU_DETECTION_PATTERNS["MED9_SPECIFIC"]:
            if re.search(pattern, line):
                return "MED9.1.1" if "1.1" in pattern else "MED9.1"
        
        if re.search(ECU_DETECTION_PATTERNS["MED9_GENERAL"], line):
            return "MED9"
        if re.search(ECU_DETECTION_PATTERNS["ME7"], line):
            return "ME7"
    
    # Check filename for MSA15/BMW/Audi patterns FIRST
    import sys
    if len(sys.argv) > 1:
        filename = sys.argv[1]
        
        # Check for MSA15 era patterns (very old systems)
        if re.search(ECU_DETECTION_PATTERNS["MSA15_ENGINES"], filename, re.IGNORECASE):
            return "MSA15"
        if re.search(ECU_DETECTION_PATTERNS["MSA15_VEHICLES"], filename, re.IGNORECASE):
            return "MSA15"
        if re.search(ECU_DETECTION_PATTERNS["MSA15_BOSCH_OLD"], filename):
            return "MSA15"
            
        # Check for BMW Motronic patterns
        if re.search(ECU_DETECTION_PATTERNS["BMW_MOTRONIC"], filename, re.IGNORECASE):
            return "Motronic"
        if re.search(ECU_DETECTION_PATTERNS["BMW_ME7"], filename, re.IGNORECASE):
            return "ME7"
        if re.search(ECU_DETECTION_PATTERNS["BOSCH_MOTRONIC"], filename):
            return "Motronic"
        if re.search(ECU_DETECTION_PATTERNS["BOSCH_ME7"], filename):
            return "ME7"
    
    # Check for MSA15 patterns in strings before other systems
    for line in strings:
        # MSA15 specific identifiers
        if re.search(ECU_DETECTION_PATTERNS["MSA15_ENGINES"], line, re.IGNORECASE):
            return "MSA15"
        if re.search(ECU_DETECTION_PATTERNS["MSA15_VEHICLES"], line, re.IGNORECASE):
            return "MSA15"
        if re.search(ECU_DETECTION_PATTERNS["MSA15_BOSCH_OLD"], line):
            return "MSA15"
    
    # Check for BMW-specific patterns in strings
    for line in strings:
        if re.search(ECU_DETECTION_PATTERNS["BMW_IN_STRINGS"], line, re.IGNORECASE):
            if re.search(ECU_DETECTION_PATTERNS["BMW_BOSCH_NUMBERS"], line):
                return "Motronic"
        
        if re.search(ECU_DETECTION_PATTERNS["OLD_BOSCH"], line):
            return "Motronic"
        if re.search(ECU_DETECTION_PATTERNS["NEWER_BOSCH"], line):
            return "ME7"
    
    # Check for SID patterns
    for line in strings:
        for pattern in ECU_DETECTION_PATTERNS["SID_SPECIFIC"]:
            if re.search(pattern, line):
                return "SID"
    
    # Check for diesel ECU patterns (EDC15 AFTER MSA15 check)
    for line in strings:
        # Check EDC15 with more specific patterns
        if re.search(ECU_DETECTION_PATTERNS["EDC15"], line):
            return "EDC15"
        if re.search(ECU_DETECTION_PATTERNS["EDC15_BOSCH"], line):
            return "EDC15"
            
        # Check EDC16 patterns
        if re.search(ECU_DETECTION_PATTERNS["EDC16"], line):
            return "EDC16"
        
        # Special SID vs EDC16 disambiguation
        if re.search(r"\b03G906018\b", line):
            for check_line in strings:
                if re.search(ECU_DETECTION_PATTERNS["SID_CONTEXT"], check_line):
                    return "SID"
            return "EDC16"
        
        if re.search(ECU_DETECTION_PATTERNS["EDC17"], line):
            return "EDC17"
        if re.search(ECU_DETECTION_PATTERNS["CONTINENTAL"], line):
            return "Continental"
        if re.search(ECU_DETECTION_PATTERNS["DELPHI"], line):
            return "Delphi"
        if re.search(ECU_DETECTION_PATTERNS["EDC16_BOSCH"], line):
            return "EDC16"
    
    return "Unknown"

def get_patterns_for_ecu(ecu_type):
    """Return regex patterns based on ECU type"""
    if ecu_type == "MSA15":  # Very old Audi/BMW systems
        return {
            "part_number": re.compile(PART_NUMBER_PATTERNS["MSA15"]),
            "bosch_number": re.compile(BOSCH_NUMBER_PATTERNS["MSA15"]),
            "software_version": re.compile(SOFTWARE_VERSION_PATTERNS["MSA15"]),
            "calibration_id": re.compile(CALIBRATION_ID_PATTERNS["MSA15"]),
            "hardware_version": re.compile(HARDWARE_VERSION_PATTERNS["STANDARD"]),
        }
    elif ecu_type == "EDC15":
        return {
            "part_number": re.compile(PART_NUMBER_PATTERNS["EDC15"]),
            "bosch_number": re.compile(BOSCH_NUMBER_PATTERNS["EDC15"]),
            "software_version": re.compile(SOFTWARE_VERSION_PATTERNS["EDC15"]),
            "tsw_version": re.compile(TSW_VERSION_PATTERNS["EDC15"]),
        }
    elif ecu_type in ["EDC16", "EDC17"]:
        return {
            "part_number": re.compile(PART_NUMBER_PATTERNS["EDC16_17"]),
            "bosch_number": re.compile(BOSCH_NUMBER_PATTERNS["EDC16"]),
            "software_version": re.compile(SOFTWARE_VERSION_PATTERNS["EDC16_17"]),
            "calibration_id": re.compile(CALIBRATION_ID_PATTERNS["EDC16_17"]),
            "tsw_version": re.compile(TSW_VERSION_PATTERNS["EDC16_17"]),
        }
    elif ecu_type == "SID":
        return {
            "part_number": re.compile(PART_NUMBER_PATTERNS["SID"]),
            "software_version": re.compile(SOFTWARE_VERSION_PATTERNS["SID"]),
            "calibration_id": re.compile(CALIBRATION_ID_PATTERNS["SID"]),
        }
    elif ecu_type == "Motronic":
        return {
            "part_number": re.compile(PART_NUMBER_PATTERNS["MOTRONIC"]),
            "bosch_number": re.compile(BOSCH_NUMBER_PATTERNS["MOTRONIC"]),
            "software_version": re.compile(SOFTWARE_VERSION_PATTERNS["MOTRONIC_SIMPLE"]),
            "calibration_id": re.compile(CALIBRATION_ID_PATTERNS["GENERIC"]),
            "hardware_version": re.compile(HARDWARE_VERSION_PATTERNS["STANDARD"]),
        }
    elif ecu_type in ["MED9", "MED9.1", "MED9.1.1", "ME9", "ME7"]:
        return {
            "part_number": re.compile(PART_NUMBER_PATTERNS["GASOLINE_MODERN"]),
            "bosch_number": re.compile(BOSCH_NUMBER_PATTERNS["GASOLINE_ALPHA"]),
            "software_version": re.compile(SOFTWARE_VERSION_PATTERNS["GASOLINE_FLEXIBLE"]),
            "calibration_id": re.compile(CALIBRATION_ID_PATTERNS["GASOLINE_PRIMARY"]),
            "hardware_version": re.compile(HARDWARE_VERSION_PATTERNS["STANDARD"]),
        }
    elif ecu_type in ["Continental", "Delphi"]:
        return {
            "part_number": re.compile(PART_NUMBER_PATTERNS["CONTINENTAL_DELPHI"]),
            "software_version": re.compile(SOFTWARE_VERSION_PATTERNS["GENERIC"]),
            "calibration_id": re.compile(CALIBRATION_ID_PATTERNS["CONTINENTAL_DELPHI"]),
        }
    else:
        return {
            "part_number": re.compile(PART_NUMBER_PATTERNS["GENERIC"]),
            "software_version": re.compile(SOFTWARE_VERSION_PATTERNS["GENERIC"]),
            "calibration_id": re.compile(CALIBRATION_ID_PATTERNS["GENERIC"]),
        }

def is_dummy_data(value, key=None):
    """Enhanced dummy data filter"""
    if not value or len(value) < 4:
        return True
    
    # Check for repeated characters
    if len(set(value)) <= 2 and len(value) >= 6:
        return True
    
    # Check for alternating patterns
    if len(value) >= 6 and len(value) % 2 == 0:
        first_half = value[::2]
        second_half = value[1::2]
        if len(set(first_half)) <= 1 and len(set(second_half)) <= 1:
            return True
    
    # Special check for software version field
    if key == "software_version" and len(value) >= 6:
        char_counts = {}
        for char in value:
            char_counts[char] = char_counts.get(char, 0) + 1
        max_count = max(char_counts.values())
        if max_count / len(value) > 0.6:
            return True
    
    # Check against dummy patterns
    for pattern in DUMMY_DATA_PATTERNS:
        if re.match(pattern, value):
            return True
    return False

def extract_calibration_id(data):
    """Extract calibration ID from binary data"""
    # Known positions where D915A_B303 appears
    calibration_positions = CALIBRATION_ID_POSITIONS
    
    found_ids = []
    
    for pos in calibration_positions:
        if pos + 10 < len(data):  # Ensure we don't read beyond file
            # Extract 10 characters for calibration ID format (e.g., D915A_B303)
            potential_cal_id = data[pos:pos+10].decode('ascii', errors='ignore')
            
            # Validate the format: X###X_X###
            if (len(potential_cal_id) == 10 and 
                potential_cal_id[5] == '_' and
                potential_cal_id[0].isalpha() and
                potential_cal_id[1:5].isdigit() and
                potential_cal_id[4].isalpha() and
                potential_cal_id[6].isalpha() and
                potential_cal_id[7:10].isdigit()):
                
                # Avoid patterns where the parts repeat (like D915A_D915)
                prefix = potential_cal_id[:5]  # D915A
                suffix = potential_cal_id[6:]   # B303 or D915
                
                # Only accept if prefix != suffix (avoid D915A_D915 patterns)
                if prefix != suffix and not is_dummy_data(potential_cal_id):
                    found_ids.append(potential_cal_id)
    
    # Return the most common valid calibration ID
    if found_ids:
        # Count occurrences and return the most frequent valid one
        from collections import Counter
        id_counts = Counter(found_ids)
        return id_counts.most_common(1)[0][0]
    
    # Fallback: search for the pattern in the entire file
    text = data.decode('ascii', errors='ignore')
    
    # Look for calibration ID pattern
    pattern = CALIBRATION_ID_PATTERNS["POSITION_BASED"]
    matches = re.findall(pattern, text)
    
    if matches:
        # Filter out patterns where prefix and suffix are the same
        valid_matches = []
        for match in matches:
            if len(match) == 10 and match[5] == '_':
                prefix = match[:5]
                suffix = match[6:]
                # Explicitly reject D915A_D915 type patterns
                if prefix != suffix and suffix != "D915" and not is_dummy_data(match):
                    valid_matches.append(match)
        
        if valid_matches:
            # Return the most common valid match
            from collections import Counter
            match_counts = Counter(valid_matches)
            return match_counts.most_common(1)[0][0]
    
    return None

def parse_bin_metadata(filepath):
    strings = extract_ascii_strings(filepath)
    data = Path(filepath).read_bytes()
    filename = Path(filepath).name

    # Detect ECU type based on content, not hardcoded part numbers
    ecu_type = detect_ecu_type(strings)
    
    # Get patterns for this ECU type
    patterns = get_patterns_for_ecu(ecu_type)

    # Initialize results
    results = {
        "file_size_bytes": os.path.getsize(filepath),
        "checksum_xor": hex(sum(data) % 256),
        "ecu_generation": ecu_type,
        "part_number": None,
        "software_version": None,
        "calibration_id": None,
        "tsw_version": None,
    }

    # Add ECU-specific fields
    if ecu_type in ["EDC15", "EDC16", "EDC17"]:
        results["bosch_number"] = None
    elif ecu_type == "SID":
        results["siemens_number"] = None
    elif ecu_type in ["MED9", "MED9.1", "MED9.1.1", "ME9", "ME7", "Motronic", "MSA15"]:  # Include MSA15
        results["bosch_number"] = None
        results["hardware_version"] = None

    # Extract data using patterns
    for line in strings:
        for key, pattern in patterns.items():
            if results.get(key) is None:
                match = pattern.search(line)
                if match:
                    # For ME9/ME7 and EDC16/17 software version, extract captured group
                    if key == "software_version" and ecu_type in ["MED9", "MED9.1", "MED9.1.1", "ME9", "ME7", "EDC16", "EDC17"] and match.groups():
                        candidate = match.group(1)  # Get captured group (6 digits after 1037)
                    else:
                        candidate = match.group()
                        # Clean up software version for EDC15
                        if key == "software_version" and ecu_type == "EDC15" and candidate.startswith("1037"):
                            candidate = candidate[4:]
                    
                    if not is_dummy_data(candidate, key):
                        results[key] = candidate

    # Special handling for ME7/Motronic/MSA15 (including BMW) processing
    if ecu_type in ["MED9", "MED9.1", "MED9.1.1", "ME9", "ME7", "Motronic", "MSA15"]:
        # Enhanced search for BMW and older Bosch systems
        for line_num, line in enumerate(strings):
            # Look for BMW/Bosch part numbers in strings
            if results["part_number"] is None:
                if ecu_type == "MSA15":
                    # MSA15 specific part number patterns
                    msa15_part_patterns = [
                        r"\b(028906021[A-Z]{1,3})\b",   # Audi MSA15
                        r"\b(037906019[A-Z]{1,3})\b",   # VW MSA15
                        r"\b(8A0907311[A-Z]{1,3})\b",   # Audi/VW MSA15
                    ]
                    for pattern in msa15_part_patterns:
                        part_match = re.search(pattern, line)
                        if part_match and not is_dummy_data(part_match.group(1)):
                            results["part_number"] = part_match.group(1)
                            break
                else:
                    # Existing BMW-specific patterns for other ECU types
                    bmw_specific_match = re.search(r"\b([0-9]{5}[A-Z]{2}[0-9]{4})\b", line)
                    if bmw_specific_match and not is_dummy_data(bmw_specific_match.group(1)):
                        results["part_number"] = bmw_specific_match.group(1)
                        continue
                    
                    # Then try general BMW-style part numbers (but be more selective)
                    bmw_part_match = re.search(r"\b([0-9]{8,11}[A-Z]{0,3})\b", line)
                    if bmw_part_match and not is_dummy_data(bmw_part_match.group(1)):
                        candidate = bmw_part_match.group(1)
                        # Additional filtering for BMW part numbers
                        if (not re.match(r"^(.)\1+$", candidate) and  # Avoid repeated characters
                            not re.match(r"^[0-9]+$", candidate) and   # Avoid pure numbers for part numbers
                            len(candidate) >= 8):                      # Reasonable length for part numbers
                            results["part_number"] = candidate
            
            # Look for software version with enhanced filtering
            if results["software_version"] is None:
                if ecu_type in ["Motronic", "MSA15"]:
                    # Simpler patterns for older systems
                    software_patterns = [
                        r"\b([0-9]{4,8})\b",         # 4-8 digit versions for MSA15
                    ]
                else:
                    # Complex patterns for modern systems
                    software_patterns = [
                        r"\b([0-9]{6})\b",       # 6-digit versions
                        r"\b([0-9]{8})\b",       # 8-digit versions
                        r"\b1037([0-9]{6})\b",   # Bosch 1037 prefix versions
                    ]
                
                for pattern in software_patterns:
                    sw_match = re.search(pattern, line)
                    if sw_match:
                        candidate = sw_match.group(1) if sw_match.groups() else sw_match.group()
                        if (not is_dummy_data(candidate, "software_version") and 
                            candidate not in results.get("part_number", "") and  # Don't reuse part number
                            candidate != results.get("bosch_number", "") and     # Don't reuse Bosch number
                            len(candidate) >= 4 and len(candidate) <= 8):        # Reasonable length for MSA15
                            results["software_version"] = candidate
                            break
            
            # Look for calibration ID (enhanced for MSA15)
            if results["calibration_id"] is None:
                if ecu_type == "MSA15":
                    # MSA15 calibration patterns - avoid duplicating part/bosch numbers
                    cal_patterns = [
                        r"\b([A-Z][0-9]{2,3})\b",              # Like D56, A12, etc.
                        r"\b([0-9]{4,6}[A-Z]{1,2})\b",         # Like 2287A, 1234AB
                        r"\b([A-Z]{2}[0-9]{2,4})\b",           # Like AB12, CD1234
                    ]
                    for pattern in cal_patterns:
                        cal_match = re.search(pattern, line)
                        if cal_match:
                            candidate = cal_match.group(1)
                            # Make sure it's not the part number or Bosch number
                            if (not is_dummy_data(candidate) and 
                                candidate != results.get("part_number", "") and
                                candidate != results.get("bosch_number", "") and
                                len(candidate) >= 3 and len(candidate) <= 8):
                                results["calibration_id"] = candidate
                                break

            # Look for Bosch numbers (enhanced for BMW/Motronic/MSA15)
            if results["bosch_number"] is None:
                if ecu_type == "MSA15":
                    bosch_patterns = [
                        r"\b(0281001\d{3})\b",           # Very old MSA15 patterns
                    ]
                elif ecu_type == "Motronic":
                    bosch_patterns = [
                        r"\b(0261[1-3]?\d{5,6})\b",      # Older Motronic patterns
                    ]
                else:
                    bosch_patterns = [
                        r"\b(0261[A-Z]?\d{5,6})\b",      # BMW/Bosch patterns like 0261200520
                        r"\b(0261[2-6]\d{5})\b",         # Specific ME7 era patterns
                    ]
                
                for pattern in bosch_patterns:
                    bosch_match = re.search(pattern, line)
                    if bosch_match and not is_dummy_data(bosch_match.group(1)):
                        results["bosch_number"] = bosch_match.group(1)
                        break

    # Extract part number from filename if not found in content (enhanced for MSA15)
    if ecu_type in ["MED9", "MED9.1", "MED9.1.1", "ME9", "ME7", "Motronic", "MSA15"] and results["part_number"] is None:
        if ecu_type == "MSA15":
            # MSA15 part numbers from filename
            msa15_filename_patterns = [
                r"(028906021[A-Z]{1,3})",   # Audi MSA15
                r"(037906019[A-Z]{1,3})",   # VW MSA15  
                r"(8A0907311[A-Z]{1,3})",   # Audi/VW MSA15
            ]
            for pattern in msa15_filename_patterns:
                filename_match = re.search(pattern, filename)
                if filename_match:
                    results["part_number"] = filename_match.group(1)
                    break
        else:
            # Existing BMW filename patterns
            bmw_specific_filename = re.search(r"([0-9]{5}[A-Z]{2}[0-9]{4})", filename)
            if bmw_specific_filename:
                results["part_number"] = bmw_specific_filename.group(1)
            else:
                # Try broader BMW pattern
                bmw_filename_match = re.search(r"([0-9]{8,11}[A-Z]{0,3})", filename)
                if bmw_filename_match and not re.match(r"^(.)\1+$", bmw_filename_match.group(1)):
                    results["part_number"] = bmw_filename_match.group(1)
                else:
                    # Fallback to generic pattern
                    filename_match = re.search(r"([0-9][A-Z][0-9]{7}[A-Z]{1,3})", filename)
                    if filename_match:
                        results["part_number"] = filename_match.group(1)

    # Extract calibration ID from filename if not found (MSA15 specific)
    if ecu_type == "MSA15" and results["calibration_id"] is None:
        # Look for D56-style patterns in filename
        cal_filename_patterns = [
            r"_([A-Z][0-9]{2,3})_",      # Like _D56_
            r"_([0-9]{4,8})_",           # Like _2287358725_
        ]
        for pattern in cal_filename_patterns:
            cal_match = re.search(pattern, filename)
            if cal_match:
                candidate = cal_match.group(1)
                # Avoid using numbers that look like Bosch numbers
                if (not is_dummy_data(candidate) and 
                    candidate != results.get("bosch_number", "") and
                    candidate != results.get("part_number", "") and
                    not re.match(r"^0281001\d{3}$", candidate)):  # Not a Bosch number
                    results["calibration_id"] = candidate
                    break

    # Clean up duplicate fields for ME7/BMW/Motronic/MSA15
    if ecu_type in ["MED9", "MED9.1", "MED9.1.1", "ME9", "ME7", "Motronic", "MSA15"]:  # Include MSA15
        # Remove duplicate fields that aren't needed in final output
        for key in ["me7_part", "me7_version", "bosch_alt", "version_alt", "cal_id_alt", "bmw_part"]:
            if key in results:
                del results[key]

    # Extract Bosch number from filename if not found in content
    if ecu_type in ["MED9", "MED9.1", "MED9.1.1", "ME9", "ME7", "Motronic", "MSA15"] and results["bosch_number"] is None:  # Include MSA15
        if ecu_type == "MSA15":
            bosch_filename_match = re.search(r"(0281001\d{3})", filename)
        elif ecu_type == "Motronic":
            bosch_filename_match = re.search(r"(0261[1-3]?\d{5,6})", filename)
        else:
            bosch_filename_match = re.search(r"(0261[2-6]?\d{5,6})", filename)
        if bosch_filename_match:
            results["bosch_number"] = bosch_filename_match.group(1)

    # For SID ECUs, try advanced Siemens number search
    if ecu_type == "SID" and results["siemens_number"] is None:
        siemens_number = search_siemens_number_advanced(filepath, strings)
        if siemens_number:
            results["siemens_number"] = siemens_number

    return results

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "example.bin"
    result = parse_bin_metadata(path)
    print(result)