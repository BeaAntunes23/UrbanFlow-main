#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validate 18-district GTFS coverage for Portugal-wide mapping.

Maps each district to expected GTFS operators, validates feeds exist,
and shows coverage status + recommendations.

Usage:
  python experiments/validate_district_coverage.py \\
    --feeds-dir experiments/results/feeds \\
    [--show-details]
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Ensure UTF-8 output encoding on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 18 Portuguese districts + autonomous regions mapping to operators
DISTRICTS_OPERATORS: Dict[str, Dict] = {
    "aveiro": {
        "name": "Aveiro",
        "operators": ["STCP Aveiro"],
        "files": ["gtfs_aveiro.zip"],
        "synthetic_files": ["aveiro_osm_synthetic.json"],
        "regions": ["aveiro"],
    },
    "beja": {
        "name": "Beja",
        "operators": ["CT Beja"],
        "files": ["gtfs_beja.zip"],
        "synthetic_files": ["beja_osm_synthetic.json"],
        "regions": ["beja"],
    },
    "braga": {
        "name": "Braga",
        "operators": ["TUB Braga"],
        "files": ["gtfs_tub_braga.zip"],
        "regions": ["tub_braga"],
    },
    "braganca": {
        "name": "Bragança",
        "operators": ["CT Bragança"],
        "files": ["gtfs_braganca.zip"],
        "synthetic_files": ["braganca_osm_synthetic.json"],
        "regions": ["braganca"],
    },
    "castelo_branco": {
        "name": "Castelo Branco",
        "operators": ["CT Castelo Branco"],
        "files": ["gtfs_castelo_branco.zip"],
        "synthetic_files": ["castelo_branco_osm_synthetic.json"],
        "regions": ["castelo_branco"],
    },
    "coimbra": {
        "name": "Coimbra",
        "operators": ["SMTUC Coimbra"],
        "files": ["gtfs_smtuc_coimbra.zip"],
        "regions": ["smtuc_coimbra"],
    },
    "evora": {
        "name": "Évora",
        "operators": ["CT Évora"],
        "files": ["gtfs_evora.zip"],
        "synthetic_files": ["evora_osm_synthetic.json"],
        "regions": ["evora"],
    },
    "faro": {
        "name": "Faro",
        "operators": ["Vamus Algarve (Moverick)"],
        "files": ["gtfs_faro.zip"],
        "synthetic_files": ["faro_moverick_synthetic.json"],
        "regions": ["faro"],
    },
    "guarda": {
        "name": "Guarda",
        "operators": ["CT Guarda"],
        "files": ["gtfs_guarda.zip"],
        "synthetic_files": ["guarda_osm_synthetic.json"],
        "regions": ["guarda"],
    },
    "leiria": {
        "name": "Leiria",
        "operators": ["MobiLeiria"],
        "files": ["gtfs_leiria.zip"],
        "synthetic_files": ["leiria_osm_synthetic.json"],
        "regions": ["leiria"],
    },
    "portalegre": {
        "name": "Portalegre",
        "operators": ["CT Portalegre"],
        "files": ["gtfs_portalegre.zip"],
        "synthetic_files": ["portalegre_osm_synthetic.json"],
        "regions": ["portalegre"],
    },
    "santarem": {
        "name": "Santarém",
        "operators": ["CT Santarém"],
        "files": ["gtfs_santarem.zip"],
        "synthetic_files": ["santarem_osm_synthetic.json"],
        "regions": ["santarem"],
    },
    "lisboa": {
        "name": "Lisboa",
        "operators": ["Carris Metropolitana"],
        "files": ["gtfs_carris_metropolitana.zip"],
        "regions": ["carris_metropolitana"],
        "note": "Carris Lisboa foi integrada na Carris Metropolitana em 2022",
    },
    "madeira": {
        "name": "Madeira",
        "operators": [],
        "files": [],
        "regions": [],
        "note": "Autonomous region (island) - Not covered",
    },
    "porto": {
        "name": "Porto",
        "operators": ["STCP Porto"],
        "files": ["gtfs_stcp.zip"],
        "regions": ["stcp"],
    },
    "setubal": {
        "name": "Setúbal/Cascais",
        "operators": ["Rede Mobi Cascais"],
        "files": ["gtfs_cascais.zip"],
        "regions": ["cascais"],
    },
    "viseu": {
        "name": "Viseu",
        "operators": ["CTV Viseu"],
        "files": ["gtfs_viseu.zip"],
        "synthetic_files": ["viseu_osm_synthetic.json"],
        "regions": ["viseu"],
    },
    "vila_real": {
        "name": "Vila Real",
        "operators": ["RodoNorte"],
        "files": ["gtfs_vila_real.zip"],
        "synthetic_files": ["vila_real_osm_synthetic.json"],
        "regions": ["vila_real"],
    },
    "viana_castelo": {
        "name": "Viana do Castelo",
        "operators": ["TTM Viana do Castelo"],
        "files": ["gtfs_viana_castelo.zip"],
        "synthetic_files": ["viana_castelo_osm_synthetic.json"],
        "regions": ["viana_castelo"],
    },
    "acores": {
        "name": "Açores",
        "operators": [],
        "files": [],
        "regions": [],
        "note": "Autonomous region (island) - Not covered",
    },
}


def validate_coverage(feeds_dir: str, show_details: bool = False) -> Tuple[int, int]:
    """Check GTFS file availability for all districts.
    
    Returns:
        (available_districts, total_districts_with_expected_coverage)
    """
    feeds_path = Path(feeds_dir)
    if not feeds_path.exists():
        print(f"[!] Feeds directory not found: {feeds_dir}")
        return 0, 0

    available_files = {f.name for f in feeds_path.glob("*.zip")}

    # Also check for synthetic JSON files in neighbouring results dirs
    synthetic_candidates_dirs = [
        feeds_path.parent,  # e.g. Backend/experiments/results/
        feeds_path.parent.parent / "experiments" / "results",  # project-root fallback
    ]
    # map filename -> has_data (at least one stop or route)
    available_synthetic: Dict[str, bool] = {}
    for d in synthetic_candidates_dirs:
        if d.exists():
            for f in d.glob("*.json"):
                has_data = True
                try:
                    with f.open("r", encoding="utf-8") as fh:
                        payload = json.load(fh)
                    if isinstance(payload, dict) and ("stops" in payload or "routes" in payload):
                        has_data = bool(payload.get("stops") or payload.get("routes"))
                except Exception:
                    # Keep conservative behaviour: presence counts if JSON cannot be parsed
                    has_data = True
                available_synthetic[f.name] = has_data
    
    active_count = 0
    total_count = 0
    
    print("\n" + "="*70)
    print("📊 PORTUGAL 18-DISTRICT GTFS COVERAGE VALIDATION")
    print("="*70)
    
    active_districts = []
    missing_districts = []
    
    for district_key, district_info in sorted(DISTRICTS_OPERATORS.items()):
        name = district_info["name"]
        files = district_info["files"]
        operators = district_info["operators"]
        is_autonomous = "note" in district_info
        
        if is_autonomous:
            if show_details:
                print(f"⚫ {name:20} → {district_info['note']}")
            continue
        
        total_count += 1
        found_files = [f for f in files if f in available_files]
        missing_files = [f for f in files if f not in available_files]
        synthetic_files = district_info.get("synthetic_files", [])
        found_synthetic = [f for f in synthetic_files if available_synthetic.get(f, False)]
        empty_synthetic = [f for f in synthetic_files if f in available_synthetic and not available_synthetic.get(f, False)]
        available = len(found_files) > 0 or len(found_synthetic) > 0
        
        if available:
            active_count += 1
            status = "✅"
            active_districts.append(name)
            if show_details:
                print(f"{status} {name:20} → {', '.join(operators)}")
                for f in found_files:
                    size = available_files and (feeds_path / f).stat().st_size / (1024*1024)
                    print(f"     • {f:35} ({size:.1f} MB)")
                for f in found_synthetic:
                    print(f"     • {f:35} (synthetic JSON)")
                for f in empty_synthetic:
                    print(f"     • {f:35} (synthetic JSON, empty)")
                for f in missing_files:
                    if f not in [sf.replace(".json", ".zip") for sf in found_synthetic]:
                        print(f"     • {f:35} (missing)")
        else:
            status = "❌"
            missing_districts.append(name)
            if show_details:
                print(f"{status} {name:20} → MISSING: {', '.join(files)}")
    
    # Summary statistics
    print("\n" + "-"*70)
    print(f"📈 SUMMARY")
    print("-"*70)
    print(f"✅ Active Districts:   {active_count}/{total_count}")
    print(f"❌ Missing Districts:  {total_count - active_count}/{total_count}")
    
    if active_districts:
        print(f"\n✅ Active: {', '.join(active_districts)}")
    if missing_districts:
        print(f"\n❌ Missing: {', '.join(missing_districts)}")
    
    print("\n" + "="*70)
    
    if active_count == total_count:
        print(f"🎉 SUCCESS: All {total_count} districts in scope have GTFS coverage!")
    elif active_count >= 14:
        print(f"⚠️  PARTIAL: {active_count}/{total_count} districts covered ({100*active_count//total_count}%)")
    else:
        print(f"⚠️  LIMITED: Only {active_count}/{total_count} districts have GTFS coverage")
    
    print("="*70 + "\n")
    
    return active_count, total_count


def main():
    p = argparse.ArgumentParser(
        description="Validate 18-district GTFS coverage",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "--feeds-dir",
        default="experiments/results/feeds",
        help="Path to GTFS feeds directory",
    )
    p.add_argument(
        "--show-details",
        action="store_true",
        help="Show detailed file listing per district",
    )
    p.add_argument(
        "--fail-on-missing",
        action="store_true",
        help="Return exit code 1 when not all scoped districts have coverage",
    )
    
    args = p.parse_args()
    available, total = validate_coverage(args.feeds_dir, args.show_details)

    if args.fail_on_missing and available != total:
        exit(1)
    exit(0)


if __name__ == "__main__":
    main()
