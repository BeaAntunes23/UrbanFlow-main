#!/usr/bin/env python3
"""
Search for GTFS feeds covering Portugal's 18 districts.
Maps transport operators to districts and identifies available GTFS sources.
"""

# 18 Districts of Portugal with current operator coverage
DISTRICTS_COVERAGE = {
    # ✅ Complete coverage
    "Aveiro": {
        "operators": ["?"],
        "notes": "Urban buses in Aveiro city - needs search",
    },
    "Beja": {
        "operators": ["?"],
        "notes": "Southern Alentejo - sparse coverage",
    },
    "Braga": {
        "operators": ["TUB"],  # Transportes Urbanos de Braga
        "gtfs": "gtfs_tub_braga.zip",
        "status": "✅ ACTIVE",
    },
    "Bragança": {
        "operators": ["?"],
        "notes": "North-east - minimal public transport info",
    },
    "Castelo Branco": {
        "operators": ["?"],
        "notes": "Central interior - needs research",
    },
    "Covilhã": {
        "operators": ["?"],
        "notes": "Shared with Castelo Branco region",
    },
    "Coimbra": {
        "operators": ["SMTUC"],  # SMTUC Coimbra
        "gtfs": "gtfs_smtuc_coimbra.zip",
        "status": "✅ ACTIVE",
    },
    "Évora": {
        "operators": ["?"],
        "notes": "Central Alentejo - sparse",
    },
    "Faro": {
        "operators": ["?"],
        "notes": "Algarve - tourist hub, likely has bus systems",
    },
    "Guarda": {
        "operators": ["?"],
        "notes": "North-central - minimal coverage expected",
    },
    "Leiria": {
        "operators": ["?"],
        "notes": "Central-west - needs URL search",
    },
    "Lisboa": {
        "operators": [],
        "notes": "Excluded from scope at user request (no Carris)",
    },
    "Madeira": {
        "operators": ["?"],
        "notes": "Island - separate system, may not have GTFS",
    },
    "Porto": {
        "operators": ["STCP"],  # STCP Porto
        "gtfs": "gtfs_stcp.zip",
        "status": "✅ ACTIVE",
    },
    "Cascais (Setúbal region)": {
        "operators": ["Rede Mobi Cascais"],
        "gtfs": "gtfs_cascais.zip",
        "status": "✅ ACTIVE",
    },
    "Viseu": {
        "operators": ["?"],
        "notes": "Central-north - needs research",
    },
    "Vila Real": {
        "operators": ["?"],
        "notes": "North-east - minimal public transport",
    },
    "Viana do Castelo": {
        "operators": ["?"],
        "notes": "North-west coastal - limited info",
    },
    "Açores": {
        "operators": ["?"],
        "notes": "Autonomous region - separate systems, not in scope",
    },
}

# Known GTFS URLs and potential sources
GTFS_SOURCES = {
    "STCP Porto": {
        "url": "https://opendata.stcp.pt/gtfs.zip",
        "status": "active",
    },
    "Rede Mobi Cascais": {
        "url": "https://www.mobicascais.pt/wp-content/uploads/google_transit.zip",
        "status": "active",
    },
    "SMTUC Coimbra": {
        "url": "https://www.smtuc.pt/upload/Mapa_GTFS.zip",
        "status": "active",
    },
    "TUB Braga": {
        "url": "Local file: gtfs_tub_braga.zip",
        "status": "active",
    },
    # URLs to search/validate
    "Aveiro (STCP Aveiro)": {
        "url": "https://www.stcaveiro.pt/gtfs.zip",  # Guessed, needs validation
        "status": "needs_validation",
    },
    "Faro (EVtransp)": {
        "url": "https://www.evtransp.pt/gtfs.zip",  # Guessed
        "status": "needs_validation",
    },
    "Leiria (MobiLeiria)": {
        "url": "https://www.mobileiria.pt/gtfs.zip",  # Guessed
        "status": "needs_validation",
    },
}

if __name__ == '__main__':
    print("=" * 70)
    print("PORTUGAL 18 DISTRICTS — GTFS COVERAGE STATUS")
    print("=" * 70)
    
    active = 0
    missing = 0
    
    for district, info in DISTRICTS_COVERAGE.items():
        operators = info.get("operators", [])
        status = info.get("status", "⚠️  MISSING")
        notes = info.get("notes", "")
        
        if status.startswith("✅"):
            active += 1
            print(f"\n✅ {district:20} | {', '.join(operators)}")
            if "gtfs" in info:
                gtfs_files = info["gtfs"] if isinstance(info["gtfs"], list) else [info["gtfs"]]
                for gf in gtfs_files:
                    print(f"   └─ {gf}")
        else:
            missing += 1
            print(f"\n❌ {district:20} | {notes}")
            for op in operators:
                if op != "?":
                    print(f"   └─ {op}")
    
    print("\n" + "=" * 70)
    print(f"STATUS: {active} districts active, {missing} districts missing GTFS coverage")
    print("=" * 70)
