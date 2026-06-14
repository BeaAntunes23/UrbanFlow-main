#!/usr/bin/env python3
"""Export GTFS feed data to a browser-friendly JSON map payload.

Usage:
  python experiments/export_gtfs_map_data.py \
    --gtfs Backend/experiments/results/gtfs_tub_braga.zip \
    --date 20260317 \
    --out Frontend/public/data/gtfs_map_latest.json
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from collections import Counter
from typing import Dict, List

from gtfs_validate_and_summarize import detect_source, parse_date, parse_service_ids_for_date, read_csv_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export GTFS map data")
    parser.add_argument("--gtfs", required=True, help="Path to GTFS .zip or folder")
    parser.add_argument("--date", help="Date for service filtering in YYYYMMDD (default: today)")
    parser.add_argument(
        "--out",
        default="Frontend/public/data/gtfs_map_latest.json",
        help="Output JSON path for frontend map",
    )
    parser.add_argument(
        "--max-stops",
        type=int,
        default=5000,
        help="Maximum number of stops to export (highest activity first)",
    )
    return parser.parse_args()


def _safe_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _build_active_trip_ids(trips: List[Dict[str, str]], service_ids_active: set[str]) -> set[str]:
    trip_service_by_id = {
        t.get("trip_id", ""): t.get("service_id", "")
        for t in trips
        if t.get("trip_id")
    }
    if service_ids_active:
        return {
            trip_id
            for trip_id, sid in trip_service_by_id.items()
            if sid in service_ids_active
        }
    return set(trip_service_by_id.keys())


def _compute_center(stops: List[Dict[str, object]]) -> Dict[str, float]:
    if not stops:
        return {"lat": 41.5454, "lon": -8.4265}

    lats = [s["lat"] for s in stops]
    lons = [s["lon"] for s in stops]
    return {
        "lat": round(sum(lats) / len(lats), 6),
        "lon": round(sum(lons) / len(lons), 6),
    }


def main() -> int:
    args = parse_args()
    target_date = parse_date(args.date)

    source = detect_source(args.gtfs)
    agency_rows = read_csv_rows(source, "agency.txt")
    stops_rows = read_csv_rows(source, "stops.txt")
    routes_rows = read_csv_rows(source, "routes.txt")
    trips_rows = read_csv_rows(source, "trips.txt")
    stop_times_rows = read_csv_rows(source, "stop_times.txt")

    service_ids_active = parse_service_ids_for_date(source, target_date)
    active_trip_ids = _build_active_trip_ids(trips_rows, service_ids_active)

    trip_route: Dict[str, str] = {
        t.get("trip_id", ""): t.get("route_id", "")
        for t in trips_rows
        if t.get("trip_id")
    }

    route_info: Dict[str, Dict[str, str]] = {}
    for route in routes_rows:
        route_id = route.get("route_id", "")
        if not route_id:
            continue
        route_info[route_id] = {
            "route_id": route_id,
            "short_name": route.get("route_short_name", "") or route.get("route_long_name", route_id),
            "long_name": route.get("route_long_name", ""),
            "type": route.get("route_type", ""),
            "color": route.get("route_color", "") or "1c1c1f",
        }

    route_trip_count = Counter()
    stop_activity = Counter()
    departures_by_hour = Counter()
    stop_routes = {}  # Novo: mapeamento stop_id -> set de route_ids

    for row in stop_times_rows:
        trip_id = row.get("trip_id", "")
        if trip_id not in active_trip_ids:
            continue

        stop_id = row.get("stop_id", "")
        if stop_id:
            stop_activity[stop_id] += 1

        route_id = trip_route.get(trip_id)
        if route_id:
            route_trip_count[route_id] += 1
            # Novo: registar que esta paragem é servida por esta rota
            if stop_id:
                if stop_id not in stop_routes:
                    stop_routes[stop_id] = set()
                stop_routes[stop_id].add(route_id)

        if row.get("stop_sequence", "") == "1":
            departure_time = row.get("departure_time", "")
            parts = departure_time.split(":")
            if parts and parts[0].isdigit():
                hour = max(0, min(int(parts[0]), 47))
                departures_by_hour[str(hour if hour < 24 else hour - 24)] += 1

    stops_payload = []
    for stop in stops_rows:
        stop_id = stop.get("stop_id", "")
        lat = _safe_float(stop.get("stop_lat", ""))
        lon = _safe_float(stop.get("stop_lon", ""))
        if not stop_id or lat is None or lon is None:
            continue
        stops_payload.append(
            {
                "stop_id": stop_id,
                "name": stop.get("stop_name", stop_id),
                "lat": lat,
                "lon": lon,
                "activity": int(stop_activity.get(stop_id, 0)),
                "routes": sorted(list(stop_routes.get(stop_id, set()))),  # Novo: incluir rotas
            }
        )

    stops_payload.sort(key=lambda s: s["activity"], reverse=True)
    max_stops = max(100, args.max_stops)
    trimmed_stops = stops_payload[:max_stops]

    map_payload = {
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "date": target_date.isoformat(),
        "source_gtfs": os.path.abspath(args.gtfs),
        "agency": agency_rows[0].get("agency_name", "Unknown agency") if agency_rows else "Unknown agency",
        "center": _compute_center(trimmed_stops),
        "summary": {
            "stops_total": len(stops_payload),
            "stops_exported": len(trimmed_stops),
            "routes_total": len(route_info),
            "active_services": len(service_ids_active),
            "active_trips": len(active_trip_ids),
        },
        "departures_by_hour": {str(h): int(departures_by_hour.get(str(h), 0)) for h in range(24)},
        "routes": [
            {
                **info,
                "active_stop_times": int(route_trip_count.get(route_id, 0)),
            }
            for route_id, info in sorted(route_info.items(), key=lambda item: route_trip_count.get(item[0], 0), reverse=True)
        ],
        "stops": trimmed_stops,
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fp:
        json.dump(map_payload, fp, indent=2, ensure_ascii=False)

    print(json.dumps({
        "ok": True,
        "agency": map_payload["agency"],
        "date": map_payload["date"],
        "stops_exported": map_payload["summary"]["stops_exported"],
        "active_trips": map_payload["summary"]["active_trips"],
        "out": args.out,
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
