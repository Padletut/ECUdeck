import os
import json
import re

def extract_ascii_strings(filepath, min_length=5):
    with open(filepath, 'rb') as f:
        data = f.read()
    text = data.decode('latin1', errors='ignore')
    strings = []
    for min_len in [3, 4, 5]:
        strings.extend(re.findall(rf'[\x20-\x7E]{{{min_len},}}', text))
    seen = set()
    unique_strings = []
    for s in strings:
        if s not in seen:
            seen.add(s)
            unique_strings.append(s)
    return unique_strings

def detect_ecu_type_from_file(filepath, debug=False, plugin_dir="./modules"):
    strings = extract_ascii_strings(filepath)
    joined_text = " ".join(strings)

    plugin_candidates = []
    debug_log = []

    for root, dirs, files in os.walk(plugin_dir):
        for file in files:
            if file == "metadata.json":
                metadata_path = os.path.join(root, file)
                with open(metadata_path, "r", encoding="utf-8") as f:
                    try:
                        metadata = json.load(f)
                        for key, val in metadata.items():
                            required = val["detect"].get("required_strings", [])
                            pattern = val["detect"].get("pattern_regex", "")

                            has_required = all(r in joined_text for r in required)
                            matches_pattern = bool(re.search(pattern, joined_text))

                            debug_log.append({
                                "plugin": key,
                                "has_required_strings": has_required,
                                "regex_matches": matches_pattern,
                                "metadata_path": metadata_path
                            })

                            if has_required and matches_pattern:
                                plugin_candidates.append({
                                    "name": key,
                                    "path": root,
                                    "score": val.get("confidence_score", 0.5)
                                })
                    except json.JSONDecodeError:
                        debug_log.append({
                            "plugin": file,
                            "error": "Invalid JSON"
                        })

    if debug:
        for d in debug_log:
            print("[DEBUG]", d)

    if plugin_candidates:
        best = max(plugin_candidates, key=lambda x: x["score"])
        maps_path = os.path.join(best["path"], "maps.json")
        if os.path.isfile(maps_path):
            with open(maps_path, "r", encoding="utf-8") as f:
                try:
                    best["maps"] = json.load(f)
                except Exception as e:
                    best["maps"] = {"error": f"Could not load maps.json: {str(e)}"}
        else:
            best["maps"] = {"error": "maps.json not found"}
        return best

    return None

if __name__ == "__main__":
    import sys
    debug = "--debug" in sys.argv
    if debug:
        sys.argv.remove("--debug")
    
    path = sys.argv[1] if len(sys.argv) > 1 else "example.bin"
    result = detect_ecu_type_from_file(path, debug)
    print("🔍 Selected plugin:" if result else "⚠️ No match found.")
    print(json.dumps(result, indent=2))
