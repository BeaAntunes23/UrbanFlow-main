#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Merge multiple GTFS feeds into unified map + shapes JSON for the frontend.

Reads every *.zip in --feeds-dir (or explicit paths via --feeds).
All IDs are prefixed with the operator key to avoid collisions.

Usage:
  python experiments/merge_gtfs_feeds.py \
    --feeds-dir experiments/results/feeds \
    --date 20260318 \
    --map-out ../Frontend/public/data/gtfs_map_latest.json \
    --shapes-out ../Frontend/public/data/gtfs_shapes_latest.json \
    --stride 2
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import os
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set

# Colour palette assigned in order to operators
_PALETTE = [
    "#f97316", "#3b82f6", "#ef4444", "#10b981",
    "#a855f7", "#06b6d4", "#f59e0b", "#ec4899",
    "#84cc16", "#8b5cf6", "#14b8a6", "#f43f5e",
]

# Continental Portugal bounding box used to avoid synthetic outliers.
PT_MIN_LAT, PT_MAX_LAT = 36.9, 42.2
PT_MIN_LON, PT_MAX_LON = -9.6, -6.0


def _in_portugal(lat: float, lon: float) -> bool:
    return PT_MIN_LAT <= lat <= PT_MAX_LAT and PT_MIN_LON <= lon <= PT_MAX_LON

# Friendly names matched against (lowercased) zip stem
_KNOWN_NAMES: Dict[str, str] = {
    "tub_braga": "TUB Braga",
    "gtfs_tub_braga": "TUB Braga",
    "tub": "TUB Braga",
    "smtuc": "SMTUC Coimbra",
    "gtfs_smtuc": "SMTUC Coimbra",
    "cp": "CP — Comboios de Portugal",
    "cp-gtfs": "CP — Comboios de Portugal",
    "gtfs_cp": "CP — Comboios de Portugal",
    "stcp": "STCP Porto",
    "gtfs_stcp": "STCP Porto",
    "metro_porto": "Metro do Porto",
    "gtfs_metro_porto": "Metro do Porto",
    "carris": "Carris Metropolitana",
    "gtfs_carris": "Carris Metropolitana",
    "carris_metropolitana": "Carris Metropolitana",
    "metro_lisboa": "Metro de Lisboa",
    "gtfs_metro_lisboa": "Metro de Lisboa",
    "transdev": "Transdev",
    "rodonorte": "Rodonorte",
    "rede_expressos": "Rede Expressos",
    "smtuc_coimbra": "SMTUC Coimbra",
    "gtfs_smtuc_coimbra": "SMTUC Coimbra",
    "mts": "MTS",
    "gtfs_mts": "MTS",
    "transtejo": "Transtejo",
    "gtfs_transtejo": "Transtejo",
    "carris_lisboa": "Carris Lisboa",
    "gtfs_carris_lisboa": "Carris Lisboa",
    "cascais": "Rede Mobi Cascais",
    "gtfs_cascais": "Rede Mobi Cascais",
    # Additional districts for 18-district coverage
    "aveiro": "STCP Aveiro",
    "gtfs_aveiro": "STCP Aveiro",
    "leiria": "MobiLeiria",
    "gtfs_leiria": "MobiLeiria",
    "faro": "EVtransp Algarve",
    "gtfs_faro": "EVtransp Algarve",
    "viseu": "CTV Viseu",
    "gtfs_viseu": "CTV Viseu",
    "viana_castelo": "TTM Viana do Castelo",
    "gtfs_viana_castelo": "TTM Viana do Castelo",
    "vila_real": "RodoNorte",
    "gtfs_vila_real": "RodoNorte",
    "guarda": "CT Guarda",
    "gtfs_guarda": "CT Guarda",
    "castelo_branco": "CT Castelo Branco",
    "gtfs_castelo_branco": "CT Castelo Branco",
    "braganca": "CT Bragança",
    "gtfs_braganca": "CT Bragança",
    "beja": "CT Beja",
    "gtfs_beja": "CT Beja",
    "evora": "CT Évora",
    "gtfs_evora": "CT Évora",
    "portalegre": "CT Portalegre",
    "gtfs_portalegre": "CT Portalegre",
    "santarem": "CT Santarém",
    "gtfs_santarem": "CT Santarém",
    "agueda_aveiro": "CM Águeda",
    "gtfs_agueda_aveiro": "CM Águeda",
    "mobiave": "MobiAVE",
    "gtfs_mobiave": "MobiAVE",
    "guimabus": "GuimaBus Guimarães",
    "gtfs_guimabus": "GuimaBus Guimarães",
    "tuba_barcelos": "TUBA Barcelos",
    "gtfs_tuba_barcelos": "TUBA Barcelos",
}


# Operator to district mapping (18 Portuguese districts)
_OPERATOR_DISTRICTS: Dict[str, str] = {
    "aveiro": "aveiro",
    "beja": "beja",
    "tub_braga": "braga",
    "braganca": "braganca",
    "castelo_branco": "castelo_branco",
    "smtuc_coimbra": "coimbra",
    "evora": "evora",
    "faro": "faro",
    "guarda": "guarda",
    "leiria": "leiria",
    "carris_lisboa": "lisboa",
    "carris_metropolitana": "lisboa",
    "cascais": "setubal",
    "transtejo": "setubal",
    "stcp": "porto",
    "viseu": "viseu",
    "vila_real": "vila_real",
    "viana_castelo": "viana_castelo",
    "portalegre": "portalegre",
    "santarem": "santarem",
    "agueda_aveiro": "aveiro",
    "mobiave": "braga",
    "guimabus": "braga",
    "tuba_barcelos": "braga",
}

_EXCLUDED_OPERATOR_KEYS: Set[str] = {
    "cp",
    "cp_gtfs",
    "metro_lisboa",
    "metro_porto",
    "mts",
    "transtejo",
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Merge multiple GTFS feeds")
    p.add_argument("--feeds-dir", help="Directory with *.zip GTFS feeds")
    p.add_argument("--feeds", nargs="*", help="Explicit zip paths (override --feeds-dir)")
    p.add_argument("--date", help="Service date YYYYMMDD (default: today)")
    p.add_argument("--map-out", default="../Frontend/public/data/gtfs_map_latest.json")
    p.add_argument("--shapes-out", default="../Frontend/public/data/gtfs_shapes_latest.json")
    p.add_argument("--stride", type=int, default=2, help="Shape point decimation stride")
    p.add_argument("--max-stops", type=int, default=20000, help="Max stops per operator")
    p.add_argument("--exclude-route-types", type=int, nargs="*", default=[1, 2, 4],
                   help="Route types to exclude (default: 1=Metro 2=Rail 4=Ferry). Pass empty to include all.")
    return p.parse_args()


# ── helpers ──────────────────────────────────────────────────────────────────

def _sf(s: str) -> Optional[float]:
    try:
        return float(s.strip())
    except Exception:
        return None


def _si(s: str) -> int:
    try:
        return int(s.strip())
    except Exception:
        return 0


def _read_zip_csv(zf: zipfile.ZipFile, name: str) -> List[Dict[str, str]]:
    """Read a CSV inside a zip, tolerating missing files."""
    names_lower = {n.lower(): n for n in zf.namelist()}
    real = names_lower.get(name.lower())
    if not real:
        return []
    with zf.open(real) as f:
        reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
        return list(reader)


def _strip_keys(rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Strip leading/trailing spaces from column names."""
    return [{k.strip(): v for k, v in row.items()} for row in rows]


def _parse_date(s: Optional[str]) -> dt.date:
    if not s:
        return dt.date.today()
    s = s.strip()
    if len(s) == 8 and s.isdigit():
        return dt.date(int(s[:4]), int(s[4:6]), int(s[6:]))
    return dt.date.fromisoformat(s)


def _active_services(zf: zipfile.ZipFile, target: dt.date) -> Set[str]:
    dow = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"][target.weekday()]
    date_str = target.strftime("%Y%m%d")

    calendar = _strip_keys(_read_zip_csv(zf, "calendar.txt"))
    cal_dates = _strip_keys(_read_zip_csv(zf, "calendar_dates.txt"))

    active: Set[str] = set()
    for row in calendar:
        sid = row.get("service_id", "")
        if not sid:
            continue
        start = row.get("start_date", "00000000")
        end = row.get("end_date", "99999999")
        if start <= date_str <= end and row.get(dow, "0") == "1":
            active.add(sid)

    for row in cal_dates:
        sid = row.get("service_id", "")
        exc = row.get("exception_type", "")
        d = row.get("date", "")
        if d == date_str:
            if exc == "1":
                active.add(sid)
            elif exc == "2":
                active.discard(sid)

    # If nothing resolved, return all service_ids (feed may have no calendar)
    if not active and not calendar:
        trips = _strip_keys(_read_zip_csv(zf, "trips.txt"))
        active = {t.get("service_id", "") for t in trips if t.get("service_id")}

    return active


# ── per-feed processing ───────────────────────────────────────────────────────

def process_feed(
    zip_path: str,
    operator_key: str,
    operator_name: str,
    operator_color: str,
    target_date: dt.date,
    max_stops: int,
    stride: int,
    exclude_route_types: Set[int] = frozenset({1, 2}),
) -> dict:
    """Process one GTFS zip. Returns operator data dict."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        agency_rows = _strip_keys(_read_zip_csv(zf, "agency.txt"))
        stops_rows  = _strip_keys(_read_zip_csv(zf, "stops.txt"))
        routes_rows = _strip_keys(_read_zip_csv(zf, "routes.txt"))
        trips_rows  = _strip_keys(_read_zip_csv(zf, "trips.txt"))
        st_rows     = _strip_keys(_read_zip_csv(zf, "stop_times.txt"))
        shapes_rows = _strip_keys(_read_zip_csv(zf, "shapes.txt"))

        active_services = _active_services(zf, target_date)

    # Filter by excluded route types
    if exclude_route_types:
        routes_rows = [
            r for r in routes_rows
            if _si(r.get("route_type", "3")) not in exclude_route_types
        ]

    # Resolve agency name fallback
    agency_name = operator_name
    if agency_rows:
        agency_name = agency_rows[0].get("agency_name", operator_name)

    # Active trip IDs
    trip_service = {t.get("trip_id","").strip(): t.get("service_id","").strip() for t in trips_rows}
    trip_route   = {t.get("trip_id","").strip(): t.get("route_id","").strip()   for t in trips_rows}
    trip_shape   = {t.get("trip_id","").strip(): t.get("shape_id","").strip()   for t in trips_rows}

    allowed_route_ids = {r.get("route_id", "").strip() for r in routes_rows}
    active_trips: Set[str] = {
        tid for tid, sid in trip_service.items()
        if (not active_services or sid in active_services)
        and (not allowed_route_ids or trip_route.get(tid, "") in allowed_route_ids)
    }

    # Build route info
    route_info: Dict[str, dict] = {}
    for r in routes_rows:
        rid = r.get("route_id","").strip()
        if not rid:
            continue
        raw_color = r.get("route_color","").strip()
        if raw_color and raw_color.upper() not in ("000000","FFFFFF",""):
            color = "#" + raw_color if not raw_color.startswith("#") else raw_color
        else:
            color = operator_color
        route_info[rid] = {
            "route_id": f"{operator_key}_{rid}",
            "short_name": (r.get("route_short_name","") or r.get("route_long_name", rid)).strip(),
            "long_name": r.get("route_long_name","").strip(),
            "color": color,
            "operator": operator_key,
        }

    # Process stop_times
    stop_activity: Counter = Counter()
    stop_routes: Dict[str, Set[str]] = defaultdict(set)
    route_stops: Dict[str, Set[str]] = defaultdict(set)
    route_trip_count: Counter = Counter()
    route_shape_count: Dict[str, Counter] = defaultdict(Counter)
    departures_by_hour: Counter = Counter()

    for row in st_rows:
        tid = row.get("trip_id","").strip()
        if tid not in active_trips:
            continue
        sid = row.get("stop_id","").strip()
        rid = trip_route.get(tid,"")
        shid = trip_shape.get(tid,"")

        if sid:
            stop_activity[sid] += 1
            if rid:
                stop_routes[sid].add(f"{operator_key}_{rid}")
                route_stops[rid].add(sid)

        if rid:
            route_trip_count[rid] += 1
            if shid:
                route_shape_count[rid][shid] += 1

        if row.get("stop_sequence","").strip() == "1":
            dep = row.get("departure_time","").strip()
            parts = dep.split(":")
            if parts and parts[0].isdigit():
                h = max(0, min(int(parts[0]), 47))
                departures_by_hour[str(h if h < 24 else h - 24)] += 1

    # Build stops list
    stops_out = []
    for s in stops_rows:
        sid = s.get("stop_id","").strip()
        lat = _sf(s.get("stop_lat",""))
        lon = _sf(s.get("stop_lon",""))
        if not sid or lat is None or lon is None:
            continue
        stops_out.append({
            "stop_id": f"{operator_key}_{sid}",
            "name": s.get("stop_name", sid).strip(),
            "lat": lat,
            "lon": lon,
            "activity": int(stop_activity.get(sid, 0)),
            "routes": sorted(stop_routes.get(sid, [])),
            "operator": operator_key,
        })
    stops_out.sort(key=lambda s: s["activity"], reverse=True)
    stops_out = stops_out[:max_stops]

    # Build route list
    routes_out = [
        {**info, "active_stop_times": int(route_trip_count.get(rid, 0))}
        for rid, info in route_info.items()
    ]
    routes_out.sort(key=lambda r: r["active_stop_times"], reverse=True)

    # Build shapes (best shape per route, decimated)
    shape_points: Dict[str, List[tuple]] = defaultdict(list)
    for row in shapes_rows:
        shid = row.get("shape_id","").strip()
        if not shid:
            continue
        lat = _sf(row.get("shape_pt_lat",""))
        lon = _sf(row.get("shape_pt_lon",""))
        seq = _si(row.get("shape_pt_sequence","0"))
        if lat is None or lon is None:
            continue
        shape_points[shid].append((seq, lat, lon))

    for shid in shape_points:
        shape_points[shid].sort(key=lambda x: x[0])

    shapes_out = []
    for idx, (rid, info) in enumerate(route_info.items()):
        best_shape = max(route_shape_count[rid], key=route_shape_count[rid].get, default=None) \
                     if route_shape_count[rid] else None
        if not best_shape or best_shape not in shape_points:
            continue
        pts = shape_points[best_shape][::max(1, stride)]
        coords = [[round(lat, 6), round(lon, 6)] for _, lat, lon in pts]
        if len(coords) < 2:
            continue
        shapes_out.append({
            "route_id": f"{operator_key}_{rid}",
            "short_name": info["short_name"],
            "long_name": info["long_name"],
            "color": info["color"],
            "operator": operator_key,
            "coordinates": coords,
            "stop_count": len(route_stops.get(rid, set())),
        })

    return {
        "operator_key": operator_key,
        "operator_name": agency_name,
        "operator_color": operator_color,
        "district": _OPERATOR_DISTRICTS.get(operator_key, None),
        "stops": stops_out,
        "routes": routes_out,
        "shapes": shapes_out,
        "departures_by_hour": {str(h): int(departures_by_hour.get(str(h), 0)) for h in range(24)},
        "active_trips": len(active_trips),
    }


# ── main ─────────────────────────────────────────────────────────────────────

def _operator_key_from_path(p: str) -> str:
    stem = Path(p).stem.lower().strip()
    # Remove common prefixes/suffixes
    for prefix in ("gtfs_", "feed_"):
        if stem.startswith(prefix):
            stem = stem[len(prefix):]
    return stem.replace("-", "_").replace(" ", "_")


def _operator_name_from_key(key: str) -> str:
    return _KNOWN_NAMES.get(key, key.replace("_", " ").title())


def _is_excluded_operator(key: str) -> bool:
    return key in _EXCLUDED_OPERATOR_KEYS


def main() -> int:
    args = parse_args()
    target_date = _parse_date(args.date)

    # Collect feed paths
    feed_paths: List[str] = []
    if args.feeds:
        feed_paths = [p for p in args.feeds if os.path.isfile(p)]
    elif args.feeds_dir:
        feed_paths = sorted(str(p) for p in Path(args.feeds_dir).glob("*.zip"))
    else:
        print('{"error": "Provide --feeds-dir or --feeds"}')
        return 1

    if not feed_paths:
        print('{"error": "No GTFS zip files found"}')
        return 1

    print(f'[merge] Found {len(feed_paths)} feed(s): {[os.path.basename(p) for p in feed_paths]}', flush=True)

    operator_data = []
    for idx, path in enumerate(feed_paths):
        key = _operator_key_from_path(path)
        if _is_excluded_operator(key):
            print(f'[merge] Skipping excluded operator [{key}] {os.path.basename(path)}', flush=True)
            continue
        name = _operator_name_from_key(key)
        color = _PALETTE[idx % len(_PALETTE)]
        print(f'[merge] Processing [{key}] {os.path.basename(path)} ...', flush=True)
        try:
            exclude_types: Set[int] = set(args.exclude_route_types) if args.exclude_route_types is not None else set()
            data = process_feed(path, key, name, color, target_date, args.max_stops, args.stride, exclude_types)
            data["operator_color"] = color  # ensure palette color used for operator dot
            operator_data.append(data)
            print(f'[merge]   -> {len(data["stops"])} paragens, {len(data["routes"])} rotas, {len(data["shapes"])} shapes', flush=True)
        except Exception as exc:
            print(f'[merge]   ! Falha em {os.path.basename(path)}: {exc}', flush=True)

    if not operator_data:
        print('{"error": "All feeds failed to process"}')
        return 1

    # Merge everything
    all_stops = []
    all_routes = []
    all_shapes = []
    merged_departures: Counter = Counter()

    operators_summary = []
    for od in operator_data:
        all_stops.extend(od["stops"])
        all_routes.extend(od["routes"])
        all_shapes.extend(od["shapes"])
        for h, v in od["departures_by_hour"].items():
            merged_departures[h] += v
        operators_summary.append({
            "key": od["operator_key"],
            "name": od["operator_name"],
            "color": od["operator_color"],
            "district": od["district"],
            "stop_count": len(od["stops"]),
            "route_count": len(od["routes"]),
            "active_trips": od["active_trips"],
        })

    # Compute bounding box
    lats = [s["lat"] for s in all_stops]
    lons = [s["lon"] for s in all_stops]
    bounds = {
        "min_lat": round(min(lats) - 0.05, 4),
        "max_lat": round(max(lats) + 0.05, 4),
        "min_lon": round(min(lons) - 0.05, 4),
        "max_lon": round(max(lons) + 0.05, 4),
    }
    center = {
        "lat": round((bounds["min_lat"] + bounds["max_lat"]) / 2, 6),
        "lon": round((bounds["min_lon"] + bounds["max_lon"]) / 2, 6),
    }

    # Map JSON
    map_payload = {
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "date": target_date.isoformat(),
        "multi_operator": True,
        "operators": operators_summary,
        "center": center,
        "bounds": bounds,
        "agency": ", ".join(od["operator_name"] for od in operator_data),
        "summary": {
            "stops_exported": len(all_stops),
            "stops_total": len(all_stops),
            "routes_total": len(all_routes),
            "operators_count": len(operator_data),
            "active_services": sum(od["active_trips"] for od in operator_data),
            "active_trips": sum(od["active_trips"] for od in operator_data),
        },
        "departures_by_hour": {str(h): int(merged_departures.get(str(h), 0)) for h in range(24)},
        "routes": all_routes,
        "stops": all_stops,
    }

    # Shapes JSON
    shapes_payload = {
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "total_routes": len(all_shapes),
        "stride": args.stride,
        "operators": [od["operator_key"] for od in operator_data],
        "routes": all_shapes,
    }

    for out_path, payload in [(args.map_out, map_payload), (args.shapes_out, shapes_payload)]:
        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as fp:
            json.dump(payload, fp, separators=(",", ":"), ensure_ascii=False)
        size_kb = round(os.path.getsize(out_path) / 1024, 1)
        print(f'[merge] Wrote {out_path} ({size_kb} KB)', flush=True)

    print(json.dumps({
        "ok": True,
        "operators": len(operator_data),
        "stops_total": len(all_stops),
        "routes_total": len(all_routes),
        "shapes_total": len(all_shapes),
        "center": center,
        "bounds": bounds,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
