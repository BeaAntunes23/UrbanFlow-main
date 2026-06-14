#!/usr/bin/env python3
"""Export GTFS shapes as route polylines for the frontend map.

Usage:
  python experiments/export_gtfs_shapes.py \
    --gtfs experiments/results/gtfs_tub_braga.zip \
    --out ../Frontend/public/data/gtfs_shapes_latest.json \
    --stride 2
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from collections import defaultdict
from typing import Dict, List

from gtfs_validate_and_summarize import detect_source, read_csv_rows


# Fallback colour palette for routes without a defined colour
_PALETTE = [
    "#f97316", "#3b82f6", "#10b981", "#a855f7",
    "#ec4899", "#f59e0b", "#06b6d4", "#84cc16",
    "#ef4444", "#8b5cf6", "#14b8a6", "#f43f5e",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export GTFS shapes as route polylines")
    parser.add_argument("--gtfs", required=True, help="Path to GTFS .zip or folder")
    parser.add_argument(
        "--out",
        default="../Frontend/public/data/gtfs_shapes_latest.json",
        help="Output JSON path",
    )
    parser.add_argument(
        "--stride",
        type=int,
        default=2,
        help="Point decimation stride (1=all points, 2=every other, etc.)",
    )
    parser.add_argument(
        "--max-routes",
        type=int,
        default=300,
        help="Maximum number of routes to export",
    )
    return parser.parse_args()


def _safe_float(s: str) -> float | None:
    try:
        return float(s.strip())
    except (ValueError, AttributeError):
        return None


def _safe_int(s: str) -> int:
    try:
        return int(s.strip())
    except (ValueError, AttributeError):
        return 0


def main() -> int:
    args = parse_args()
    source = detect_source(args.gtfs)

    routes_rows = read_csv_rows(source, "routes.txt")
    trips_rows = read_csv_rows(source, "trips.txt")
    shapes_rows = read_csv_rows(source, "shapes.txt")

    # Build route info map
    route_info: Dict[str, dict] = {}
    for r in routes_rows:
        rid = r.get("route_id", "").strip()
        if not rid:
            continue
        color_raw = r.get("route_color", "").strip()
        if color_raw and color_raw != "000000":
            color = "#" + color_raw if not color_raw.startswith("#") else color_raw
        else:
            color = ""
        route_info[rid] = {
            "route_id": rid,
            "short_name": (r.get("route_short_name", "") or r.get("route_long_name", rid)).strip(),
            "long_name": r.get("route_long_name", "").strip(),
            "color": color,
        }

    # Count trips per (route, shape) to pick the most representative shape per route
    route_shape_count: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for t in trips_rows:
        rid = t.get("route_id", "").strip()
        sid = t.get("shape_id", "").strip()
        if rid and sid:
            route_shape_count[rid][sid] += 1

    # Best shape per route = most frequent shape
    route_to_shape: Dict[str, str] = {
        rid: max(counts, key=lambda s: counts[s])
        for rid, counts in route_shape_count.items()
    }

    # Parse shapes: shape_id -> sorted list of (sequence, lat, lon)
    # Note: some GTFS columns have leading spaces
    shape_points: Dict[str, List[tuple]] = defaultdict(list)
    for row in shapes_rows:
        sid = row.get("shape_id", "").strip()
        if not sid:
            continue
        # Handle column names with or without leading space
        lat = _safe_float(row.get(" shape_pt_lat") or row.get("shape_pt_lat", ""))
        lon = _safe_float(row.get(" shape_pt_lon") or row.get("shape_pt_lon", ""))
        seq = _safe_int(row.get(" shape_pt_sequence") or row.get("shape_pt_sequence", "0"))
        if lat is None or lon is None:
            continue
        shape_points[sid].append((seq, lat, lon))

    for sid in shape_points:
        shape_points[sid].sort(key=lambda x: x[0])

    # Build output
    output_routes = []
    for idx, (rid, info) in enumerate(sorted(route_info.items(), key=lambda x: x[1]["short_name"])):
        shape_id = route_to_shape.get(rid)
        if not shape_id or shape_id not in shape_points:
            continue

        pts = shape_points[shape_id]
        decimated = pts[::max(1, args.stride)]
        coords = [[round(lat, 6), round(lon, 6)] for _, lat, lon in decimated]
        if len(coords) < 2:
            continue

        color = info["color"] or _PALETTE[idx % len(_PALETTE)]
        output_routes.append({
            "route_id": rid,
            "short_name": info["short_name"],
            "long_name": info["long_name"],
            "color": color,
            "shape_id": shape_id,
            "coordinates": coords,
        })

        if len(output_routes) >= args.max_routes:
            break

    payload = {
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "total_routes": len(output_routes),
        "stride": args.stride,
        "routes": output_routes,
    }

    out_path = args.out
    out_dir = os.path.dirname(os.path.abspath(out_path))
    os.makedirs(out_dir, exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as fp:
        # Compact JSON to minimise file size
        json.dump(payload, fp, separators=(",", ":"), ensure_ascii=False)

    size_kb = os.path.getsize(out_path) / 1024
    print(json.dumps({
        "ok": True,
        "routes_exported": len(output_routes),
        "stride": args.stride,
        "size_kb": round(size_kb, 1),
        "out": out_path,
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
