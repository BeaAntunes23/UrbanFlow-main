#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ingest Vamus Algarve topology data from Moverick API and export as synthetic GTFS-like JSON.

The Moverick API (https://api.moverick.es) exposes:
- /topology/municipalities: list of operating municipalities
- /topology/lines: bus lines for a given municipality (parameterized by municipality_id)
- /topology/stops: bus stops for a given municipality
- /topology/routes: route variants (each line + direction = multiple routes) with encoded_shape polyline

This script:
1. Fetches all lines, stops, and routes for Vamus Algarve municipality (60c879a7d9f552002f4a99da)
2. Builds synthetic GTFS-like data structure matching merge_gtfs_feeds.py expectations
3. Exports as a pseudo-GTFS JSON ready for direct injection into the merge pipeline

Output: Backend/experiments/results/faro_moverick_synthetic.json
  - Contains: stops (by activity frequency), routes (with colors), shapes (decoded polylines)
  - Format mirrors structure from process_feed() in merge_gtfs_feeds.py

Usage:
  python experiments/ingest_moverick_algarve.py \
    --municipality-id 60c879a7d9f552002f4a99da \
    --api-key 1469e6cb-d4fe-4619-af60-139519a2994a \
    --out experiments/results/faro_moverick_synthetic.json
"""

import argparse
import json
import sys
from collections import Counter, defaultdict
from typing import Dict, List, Optional, Any


def _decode_polyline(encoded: str, precision: int = 6) -> List[Any]:
    """Decode Google Maps encoded polyline format to list of [lat, lon].
    
    Based on:
    https://developers.google.com/maps/documentation/utilities/polylinealgorithm
    """
    points: List[Any] = []
    idx = 0
    lat, lon = 0, 0
    changes = {'latitude': 0, 'longitude': 0}

    while idx < len(encoded):
        for unit in ['latitude', 'longitude']:
            shift = 0
            result = 0
            while True:
                byte = ord(encoded[idx]) - 63
                idx += 1
                result |= (byte & 0x1f) << shift
                shift += 5
                if byte < 0x20:
                    break
            if result & 1:
                changes[unit] = ~(result >> 1)
            else:
                changes[unit] = result >> 1

        lat += changes['latitude']
        lon += changes['longitude']

        points.append([lat / (10 ** precision), lon / (10 ** precision)])

    return points


def _fetch_json(url: str, api_key: str) -> Dict[str, Any]:
    """Fetch JSON from Moverick API with auth header."""
    try:
        import urllib.request
        import urllib.error
        
        headers = {"X-API-Key": api_key}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"[ERROR] Failed to fetch {url}: {e}", file=sys.stderr)
        raise


def _fetch_all_pages(base_url: str, endpoint_path: str, api_key: str, params: str = "") -> List[Dict[str, Any]]:
    """Fetch all paginated results from Moverick topology endpoint."""
    all_data: List[Dict[str, Any]] = []
    page = 1
    while True:
        sep = "&" if "?" in params else "?"
        url = f"{base_url}/{endpoint_path}{params}{sep}page={page}&limit=100"
        resp = _fetch_json(url, api_key)
        page_data = resp.get("data", [])
        all_data.extend(page_data)
        meta = resp.get("meta", {})
        total_pages = meta.get("total_pages", 1)
        if page >= total_pages or not page_data:
            break
        page += 1
    return all_data


# Portugal bounding box (continental + Algarve)
_PT_LAT_MIN, _PT_LAT_MAX = 36.9, 42.2
_PT_LON_MIN, _PT_LON_MAX = -9.6, -6.0


def _in_portugal(lat: float, lon: float) -> bool:
    return _PT_LAT_MIN <= lat <= _PT_LAT_MAX and _PT_LON_MIN <= lon <= _PT_LON_MAX


def ingest_algarve(municipality_id: str, api_key: str) -> Dict[str, Any]:
    """Fetch and convert Algarve (Vamus) topology to synthetic GTFS-like structure.
    
    Args:
        municipality_id: Moverick municipality ID for Vamus Algarve
        api_key: Public API key from Vamus Algarve frontend env-config.js
    
    Returns:
        dict matching process_feed() output format from merge_gtfs_feeds.py
    """
    base_url = "https://api.moverick.es"
    params = f"?municipality_id={municipality_id}"
    
    print(f"[algarve] Fetching lines for municipality {municipality_id}...", flush=True)
    lines_data = _fetch_all_pages(base_url, "topology/lines", api_key, params)
    print(f"[algarve] Fetched {len(lines_data)} lines", flush=True)
    
    print(f"[algarve] Fetching stops...", flush=True)
    stops_data = _fetch_all_pages(base_url, "topology/stops", api_key, params)
    print(f"[algarve] Fetched {len(stops_data)} stops", flush=True)
    
    print(f"[algarve] Fetching routes...", flush=True)
    routes_data_raw = _fetch_all_pages(base_url, "topology/routes", api_key, params)
    print(f"[algarve] Fetched {len(routes_data_raw)} route variants", flush=True)
    
    # Build line_id -> line_name mapping
    line_map: Dict[str, Dict[str, Any]] = {}
    for line in lines_data:
        line_id = line.get("id", "")
        line_map[line_id] = {
            "name": line.get("name", ""),
            "short_name": line.get("short_name", ""),
            "description": line.get("description", ""),
            "mode": line.get("mode", 3),  # 3=bus mode
            "color": line.get("color", "") or "#f97316",  # orange fallback
        }
    
    # Build stops: stop_id -> (name, lat, lon)
    stop_map: Dict[str, Dict[str, Any]] = {}
    for stop in stops_data:
        sid = stop.get("id", "")
        coords = stop.get("coordinates", [])
        if not sid or len(coords) < 2:
            continue
        # Moverick API returns coordinates as [longitude, latitude]
        lat = float(coords[1])
        lon = float(coords[0])
        if not _in_portugal(lat, lon):
            continue  # skip stops outside Portugal (e.g. Spanish municipalities)
        stop_map[sid] = {
            "name": stop.get("name", ""),
            "lat": lat,
            "lon": lon,
        }
    
    # Group routes by line and decode shapes
    routes_by_line: Dict[str, Dict[str, List[Any]]] = defaultdict(lambda: {
        "variants": [], "encoded_shapes": [], "all_coords": []
    })
    
    for route in routes_data_raw:
        line_id = route.get("line_id", "")
        encoded_shape = route.get("encoded_shape", "")
        
        if not line_id:
            continue
        
        info = {
            "code": route.get("code", ""),
            "direction": route.get("direction", 0),
            "origin": route.get("origin", ""),
            "destination": route.get("destination", ""),
        }
        routes_by_line[line_id]["variants"].append(info)
        
        if encoded_shape:
            try:
                coords = _decode_polyline(encoded_shape)
                routes_by_line[line_id]["encoded_shapes"].append(coords)
                routes_by_line[line_id]["all_coords"].extend(coords)
            except Exception as e:
                print(f"[algarve] Warning: failed to decode shape for route {info['code']}: {e}", flush=True)
    
    # Synthesize route records (one per line, use best shape)
    synth_routes: List[Dict[str, Any]] = []
    synth_shapes: List[Dict[str, Any]] = []
    
    for line_id, line_info in line_map.items():
        if line_id not in routes_by_line:
            continue
        
        route_data = routes_by_line[line_id]
        variants = route_data["variants"]
        
        if not variants:
            continue
        
        # Use first variant as canonical (direction 0)
        canonical = next((v for v in variants if v["direction"] == 0), variants[0])
        
        route_id = f"faro_{line_id[:8]}"  # synthetic ID
        color = line_info["color"]
        
        synth_routes.append({
            "route_id": route_id,
            "short_name": line_info["short_name"],
            "long_name": f"{canonical['origin']} → {canonical['destination']}",
            "color": color,
            "operator": "faro",
            "active_stop_times": 1,  # dummy; will be updated after linking
        })
        
        # Synthesize shape
        if route_data["all_coords"]:
            # Decimate for frontend: keep every 2nd point
            coords = route_data["all_coords"]
            decimated = [coords[i] for i in range(0, len(coords), max(1, len(coords) // 450))]
            if len(decimated) >= 2:
                synth_shapes.append({
                    "route_id": route_id,
                    "short_name": line_info["short_name"],
                    "long_name": f"{canonical['origin']} → {canonical['destination']}",
                    "color": color,
                    "operator": "faro",
                    "coordinates": decimated,
                })
    
    # Synthesize stops with activity = assignment to routes
    synth_stops: List[Dict[str, Any]] = []
    stop_routes: Dict[str, List[str]] = defaultdict(list)
    
    # Simple heuristic: distribute stops across lines based on proximity
    # For now, assign each stop to all lines (simplified; real would use stop_times)
    for stop_id, stop_info in stop_map.items():
        synth_id = f"faro_{stop_id[:8]}"
        routes_for_stop = [f"faro_{lid[:8]}" for lid in routes_by_line.keys()]
        
        synth_stops.append({
            "stop_id": synth_id,
            "name": stop_info["name"],
            "lat": stop_info["lat"],
            "lon": stop_info["lon"],
            "activity": 1,  # dummy; aggregated afterward
            "routes": routes_for_stop,
            "operator": "faro",
        })
        for rid in routes_for_stop:
            stop_routes[rid].append(synth_id)
    
    # Update route activity counts
    for route in synth_routes:
        route["active_stop_times"] = len(stop_routes.get(route["route_id"], []))
    
    # Build departures summary (dummy: uniform across hours)
    departures_by_hour = {str(h): len(synth_routes) * 10 for h in range(24)}
    
    result = {
        "operator_key": "faro",
        "operator_name": "EVtransp Algarve (Moverick API)",
        "operator_color": "#f97316",
        "district": "faro",
        "stops": synth_stops,
        "routes": synth_routes,
        "shapes": synth_shapes,
        "departures_by_hour": departures_by_hour,
        "active_trips": len(synth_routes),
    }
    
    return result


def main() -> int:
    p = argparse.ArgumentParser(description="Ingest Vamus Algarve from Moverick API")
    p.add_argument("--municipality-id", default="60c879a7d9f552002f4a99da")
    p.add_argument("--api-key", default="1469e6cb-d4fe-4619-af60-139519a2994a")
    p.add_argument("--out", default="experiments/results/faro_moverick_synthetic.json")
    args = p.parse_args()
    
    try:
        print("[algarve] Starting ingestion...", flush=True)
        data = ingest_algarve(args.municipality_id, args.api_key)
        
        import os
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
        
        size_kb = round(os.path.getsize(args.out) / 1024, 1)
        print(json.dumps({
            "ok": True,
            "stops": len(data["stops"]),
            "routes": len(data["routes"]),
            "shapes": len(data["shapes"]),
            "output": args.out,
            "size_kb": size_kb,
        }, indent=2))
        return 0
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
