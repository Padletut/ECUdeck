import re
import os
from pathlib import Path

# =============================================================================
# REGEX PATTERN CONSTANTS - ECU Type Detection Only
# =============================================================================

# ECU Type Detection Patterns
ECU_DETECTION_PATTERNS = {
    # Gasoline ECU patterns - simplified to family level
    "MED9": r"\b(MED9|TFSI|FSI)\b",
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
    
    # SID patterns - focus on technical identifiers not part numbers
    "SID_PPD": r"\bPPD\s*\d+\.\d+\b",  # Piezo Pumpe Düse version indicators
    "SID_CONTEXT": r"\b(PPD|SN0F7|7010\d{6})\b",  # Technical SID identifiers
    "SID_REFERENCES": r"\bSID\b",  # Direct SID system references
    
    # Diesel ECU patterns
    "EDC15": r"\b(038906019[A-Z]{2}|045906019[A-Z]{1,3})\b",
    "EDC16": r"\b(038906016[A-Z]|038906018[A-Z]|03G906021[A-Z]?|8E0907401[A-Z]{1,3})\b",
    "EDC17": r"\b(03L906018|04L906056)\b",
    "EDC16_BOSCH": r"\b0281011\d{3}\b",
    "EDC15_BOSCH": r"\b028101[0-9]{4}\b",  # More specific EDC15 pattern to avoid MSA15 conflict
    "EDC15_IDENTIFIER": r"\bSG\b",  # EDC15 systems use SG identifier
    
    # Other manufacturers
    "CONTINENTAL": r"\b(A2C|5WY)\b",
    "DELPHI": r"\b(DCM|DDCR)\b",
    
    # MSA15 specific patterns (check BEFORE EDC15)
    "MSA15_ENGINES": r"\b(D19|D1900|D21|D24|M20|M30|S14|S38)\b",  # MSA15 era engines
    "MSA15_BOSCH_OLD": r"\b0281001\d{3}\b",                 # Very old Bosch numbers (MSA15 era)
    "MSA15_PART_NUMBERS": r"\b028906021[A-Z]\b",            # Old VW/Audi MSA15 part numbers
    "MSA15_ENGINE_SPECS": r"\bR4V2T\b",                     # MSA15 engine specifications
    "MSA15_CALIBRATION_IDS": r"\b228735872[0-9]\b",         # MSA15 calibration dataset IDs
    "MSA15_SOFTWARE_IDS": r"\bR150G[0-9]{3}\b",             # MSA15 software identifiers
    "MSA15_IDENTIFIER": r"\bR4\s+EDC\s+AG\b",  # MSA15 systems use specific "R4 EDC AG" pattern
    "MSA15_AG_CONTEXT": r"\bAG\b.*\bR4V2T\b|\bR4V2T\b.*\bAG\b",  # AG only when with R4V2T context
    
    # Motronic specific patterns
    "MOTRONIC_M17": r"\b(M1\.7|M1\.7\.2|Motronic)\b",
    "ERCOSEK": r"\bERCOSEK\b",  # ETAS development signature often found in Motronic
    "ETAS": r"\bETAS\b",        # ETAS tools used for Motronic development
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def extract_ascii_strings(filepath, min_length=5):
    """Extract ASCII strings from binary file"""
    with open(filepath, 'rb') as f:
        data = f.read()

    text = data.decode('latin1', errors='ignore')
    # Try multiple min_lengths to catch shorter patterns like "M1.7"
    strings = []
    for min_len in [3, 4, 5]:
        strings.extend(re.findall(rf'[\x20-\x7E]{{{min_len},}}', text))
    
    # Remove duplicates while preserving order
    seen = set()
    unique_strings = []
    for s in strings:
        if s not in seen:
            seen.add(s)
            unique_strings.append(s)
    
    return unique_strings

def detect_ecu_type(strings, debug=False):
    """Detect ECU generation based on patterns in strings only (no filename dependency)"""
    
    if debug:
        print(f"Processing {len(strings)} strings...")
        # Look for specific patterns we're interested in
        for i, line in enumerate(strings):
            if any(pattern in line.upper() for pattern in ['MED9', 'TFSI', 'FSI', 'M1.7', 'ERCOSEK', 'ETAS', 'MPC56X', 'EDC', '045906019', '0281010', 'D19', 'D1900', 'MSA15', '0281001', '028906021', 'R4V2T', '2287358', 'R150G', '0261200', 'R4 EDC AG', 'R4 EDC SG', 'PPD', 'SN0F7']):
                print(f"Found relevant string {i}: {line[:100]}...")
    
    # Check for SID/PPD patterns FIRST (before other patterns that might overlap)
    for line in strings:
        # PPD (Piezo Pumpe Düse) - strong SID indicator
        if re.search(ECU_DETECTION_PATTERNS["SID_PPD"], line, re.IGNORECASE):
            if debug:
                print(f"Found SID PPD pattern in: {line[:100]}")
            return "SID"
        
        # Direct SID system references
        if re.search(ECU_DETECTION_PATTERNS["SID_REFERENCES"], line, re.IGNORECASE):
            if debug:
                print(f"Found direct SID reference in: {line[:100]}")
            return "SID"
        
        # SID context patterns (technical identifiers)
        if re.search(ECU_DETECTION_PATTERNS["SID_CONTEXT"], line):
            if debug:
                print(f"Found SID context pattern in: {line[:100]}")
            return "SID"
    
    # Check for MSA15 patterns FIRST (before EDC15 to catch old systems properly)
    msa15_indicators = 0
    msa15_patterns_found = []
    
    for line in strings:
        # MSA15 specific identifiers
        if re.search(ECU_DETECTION_PATTERNS["MSA15_ENGINES"], line, re.IGNORECASE):
            msa15_indicators += 1
            msa15_patterns_found.append(f"engine pattern in: {line[:50]}")
            if debug:
                print(f"Found MSA15 engine pattern in: {line[:100]}")
        
        if re.search(ECU_DETECTION_PATTERNS["MSA15_BOSCH_OLD"], line):
            msa15_indicators += 1
            msa15_patterns_found.append(f"old Bosch pattern in: {line[:50]}")
            if debug:
                print(f"Found MSA15 old Bosch pattern in: {line[:100]}")
        
        # MSA15 specific identifier (very strong indicator)
        if re.search(ECU_DETECTION_PATTERNS["MSA15_IDENTIFIER"], line, re.IGNORECASE):
            msa15_indicators += 3  # Very strong indicator
            msa15_patterns_found.append(f"MSA15 R4 EDC AG identifier in: {line[:50]}")
            if debug:
                print(f"Found MSA15 R4 EDC AG identifier in: {line[:100]}")
        
        # AG only with R4V2T context (strong indicator)
        if re.search(ECU_DETECTION_PATTERNS["MSA15_AG_CONTEXT"], line, re.IGNORECASE):
            msa15_indicators += 2  # Strong indicator
            msa15_patterns_found.append(f"MSA15 AG with R4V2T context in: {line[:50]}")
            if debug:
                print(f"Found MSA15 AG with R4V2T context in: {line[:100]}")
        
        # MSA15 part numbers (strong indicator)
        if re.search(ECU_DETECTION_PATTERNS["MSA15_PART_NUMBERS"], line):
            msa15_indicators += 2  # Strong indicator
            msa15_patterns_found.append(f"MSA15 part number in: {line[:50]}")
            if debug:
                print(f"Found MSA15 part number pattern in: {line[:100]}")
        
        # MSA15 engine specifications (strong indicator)
        if re.search(ECU_DETECTION_PATTERNS["MSA15_ENGINE_SPECS"], line):
            msa15_indicators += 2  # Strong indicator
            msa15_patterns_found.append(f"MSA15 engine spec in: {line[:50]}")
            if debug:
                print(f"Found MSA15 engine spec pattern in: {line[:100]}")
        
        # MSA15 calibration IDs (strong indicator)
        if re.search(ECU_DETECTION_PATTERNS["MSA15_CALIBRATION_IDS"], line):
            msa15_indicators += 2  # Strong indicator
            msa15_patterns_found.append(f"MSA15 calibration ID in: {line[:50]}")
            if debug:
                print(f"Found MSA15 calibration ID pattern in: {line[:100]}")
        
        # MSA15 software IDs (strong indicator)
        if re.search(ECU_DETECTION_PATTERNS["MSA15_SOFTWARE_IDS"], line):
            msa15_indicators += 2  # Strong indicator
            msa15_patterns_found.append(f"MSA15 software ID in: {line[:50]}")
            if debug:
                print(f"Found MSA15 software ID pattern in: {line[:100]}")
        
        # Direct MSA15 reference
        if re.search(r"\bMSA15\b", line, re.IGNORECASE):
            msa15_indicators += 2  # Strong indicator
            msa15_patterns_found.append(f"direct MSA15 reference in: {line[:50]}")
            if debug:
                print(f"Found direct MSA15 reference in: {line[:100]}")
    
    if debug:
        print(f"MSA15 indicators found: {msa15_indicators}")
        for pattern in msa15_patterns_found:
            print(f"  - {pattern}")
    
    # Return MSA15 if we have strong indicators
    if msa15_indicators >= 2:
        if debug:
            print(f"MSA15 detected with {msa15_indicators} indicators")
        return "MSA15"
    
    # Check for diesel EDC patterns AFTER MSA15 (to avoid conflicts with old Bosch numbers)
    for line in strings:
        # Check EDC15 with specific patterns - most specific first
        if re.search(ECU_DETECTION_PATTERNS["EDC15"], line):
            if debug:
                print(f"Found EDC15 part number pattern in: {line[:100]}")
            return "EDC15"
        
        # EDC15 identifier (strong indicator)
        if re.search(ECU_DETECTION_PATTERNS["EDC15_IDENTIFIER"], line):
            if debug:
                print(f"Found EDC15 SG identifier in: {line[:100]}")
            return "EDC15"
        
        # Direct EDC reference - very strong indicator
        if re.search(r"\bEDC\b", line, re.IGNORECASE):
            if debug:
                print(f"Found direct EDC reference in: {line[:100]}")
            return "EDC15"  # Default to EDC15 for generic EDC references
        
        # EDC15 Bosch numbers (but only if not MSA15)
        if re.search(ECU_DETECTION_PATTERNS["EDC15_BOSCH"], line):
            if debug:
                print(f"Found EDC15 Bosch pattern in: {line[:100]}")
            return "EDC15"
            
        # Check EDC16 patterns
        if re.search(ECU_DETECTION_PATTERNS["EDC16"], line):
            if debug:
                print(f"Found EDC16 pattern in: {line[:100]}")
            return "EDC16"
        
        if re.search(ECU_DETECTION_PATTERNS["EDC17"], line):
            if debug:
                print(f"Found EDC17 pattern in: {line[:100]}")
            return "EDC17"
        if re.search(ECU_DETECTION_PATTERNS["EDC16_BOSCH"], line):
            if debug:
                print(f"Found EDC16 Bosch pattern in: {line[:100]}")
            return "EDC16"
    
    # Check for gasoline ECUs - be very specific about MED9 variants
    for line in strings:
        # Direct MED9 references (most specific)
        if re.search(r"\bMED9[0-9]*\b", line, re.IGNORECASE):
            if debug:
                print(f"Found direct MED9 pattern in: {line[:100]}")
            return "MED9"
        
        # TFSI/FSI patterns (strong MED9 indicators)
        if re.search(r"\b(TFSI|FSI)\b", line, re.IGNORECASE):
            if debug:
                print(f"Found TFSI/FSI pattern in: {line[:100]}")
            return "MED9"
        
        # ME7 patterns
        if re.search(ECU_DETECTION_PATTERNS["ME7"], line):
            if debug:
                print(f"Found ME7 family pattern in: {line[:100]}")
            return "ME7"
    
    # Check for Motronic M1.7 patterns (only after ruling out MED9)
    # Be much more restrictive - require actual M1.7 reference
    for line in strings:
        # Direct M1.7 references - this is the most reliable indicator
        if re.search(r"\bM1\.7\b", line, re.IGNORECASE):
            if debug:
                print(f"Found M1.7 pattern in: {line[:100]}")
            return "Motronic"
        
        # Also check for M1.7 with variations (like "M1.7 u" or embedded patterns)
        if re.search(r"M1\.7[\s\w]*", line, re.IGNORECASE):
            if debug:
                print(f"Found M1.7 variant pattern in: {line[:100]}")
            return "Motronic"
    
    # Check for BMW-specific patterns in strings (move this up before general checks)
    for line in strings:
        # BMW E36 with old Bosch numbers (Motronic era)
        if re.search(r"\bE36\b", line, re.IGNORECASE):
            if debug:
                print(f"Found BMW E36 pattern in: {line[:100]}")
            return "Motronic"
        
        # Old Bosch numbers that are typical of Motronic systems
        if re.search(r"\b0261200\d{3}\b", line):
            if debug:
                print(f"Found old Bosch Motronic pattern in: {line[:100]}")
            return "Motronic"
        
        if re.search(ECU_DETECTION_PATTERNS["BMW_IN_STRINGS"], line, re.IGNORECASE):
            if re.search(ECU_DETECTION_PATTERNS["BMW_BOSCH_NUMBERS"], line):
                if debug:
                    print(f"Found BMW with Bosch number in: {line[:100]}")
                return "Motronic"
        
        if re.search(ECU_DETECTION_PATTERNS["OLD_BOSCH"], line):
            if debug:
                print(f"Found old Bosch number in: {line[:100]}")
            return "Motronic"
        if re.search(ECU_DETECTION_PATTERNS["NEWER_BOSCH"], line):
            if debug:
                print(f"Found newer Bosch number in: {line[:100]}")
            return "ME7"
    
    # Only check ERCOSEK/ETAS for Motronic if we don't have modern processor indicators
    has_modern_processor = False
    for line in strings:
        if re.search(r"\bMPC56[x0-9]\b", line, re.IGNORECASE):
            has_modern_processor = True
            break
    
    # If we have modern processors (MPC56x), this is likely NOT classic Motronic
    if not has_modern_processor:
        motronic_indicators = 0
        for line in strings:
            # ETAS/ERCOSEK signatures - only count for older systems
            if re.search(r"ERCOSEK", line, re.IGNORECASE):
                motronic_indicators += 1
                if debug:
                    print(f"Found ERCOSEK pattern in: {line[:100]}")
            
            if re.search(r"ETAS", line, re.IGNORECASE):
                motronic_indicators += 1
                if debug:
                    print(f"Found ETAS pattern in: {line[:100]}")
            
            # General Motronic references
            if re.search(r"Motronic", line, re.IGNORECASE):
                motronic_indicators += 1
                if debug:
                    print(f"Found Motronic pattern in: {line[:100]}")
        
        # Only return Motronic if we have multiple indicators AND no modern processors
        if motronic_indicators >= 2:
            return "Motronic"
    
    # Check for other manufacturers
    for line in strings:
        if re.search(ECU_DETECTION_PATTERNS["CONTINENTAL"], line):
            return "Continental"
        if re.search(ECU_DETECTION_PATTERNS["DELPHI"], line):
            return "Delphi"
    
    return "Unknown"

def detect_ecu_type_from_file(filepath, debug=False):
    """Main function to detect ECU type from a binary file"""
    # Handle both binary files and text files (for testing)
    if filepath.endswith('_strings.txt'):
        # Reading from strings file directly
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            strings = [line.strip() for line in f.readlines() if len(line.strip()) >= 5]
    else:
        # Extract strings from binary file
        strings = extract_ascii_strings(filepath)
    
    ecu_type = detect_ecu_type(strings, debug)
    return {
        "ecu_type": ecu_type,
        "file_path": filepath,
        "file_size_bytes": os.path.getsize(filepath)
    }

if __name__ == "__main__":
    import sys
    debug = "--debug" in sys.argv
    if debug:
        sys.argv.remove("--debug")
    
    path = sys.argv[1] if len(sys.argv) > 1 else "example.bin"
    result = detect_ecu_type_from_file(path, debug)
    print(result)