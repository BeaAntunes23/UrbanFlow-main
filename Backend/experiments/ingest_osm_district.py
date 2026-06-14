#!/usr/bin/env python3
"""
Ingest bus route data from OpenStreetMap Overpass API for Portuguese districts.
Generates synthetic GTFS-like JSON for districts not covered by official GTFS feeds.

Usage:
  python experiments/ingest_osm_district.py --district aveiro
  python experiments/ingest_osm_district.py --district all
"""
import argparse
import hashlib
import json
import os
import ssl
import sys
import time
import urllib.parse
import urllib.request

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

DISTRICTS = {
    "aveiro":         {"name": "Aveiro",           "bbox": (40.5,-8.8,41.1,-7.8), "operator_key": "aveiro_osm"},
    "beja":           {"name": "Beja",             "bbox": (37.3,-8.6,38.4,-6.9), "operator_key": "beja_osm"},
    "braganca":       {"name": "Braganca",         "bbox": (41.0,-7.7,42.2,-6.0), "operator_key": "braganca_osm"},
    "castelo_branco": {"name": "Castelo Branco",   "bbox": (39.6,-8.0,40.4,-6.8), "operator_key": "castelo_branco_osm"},
    "evora":          {"name": "Evora",            "bbox": (38.2,-8.3,39.0,-7.0), "operator_key": "evora_osm"},
    "guarda":         {"name": "Guarda",           "bbox": (40.2,-7.5,41.0,-6.5), "operator_key": "guarda_osm"},
    "leiria":         {"name": "Leiria",           "bbox": (39.4,-9.0,40.0,-8.0), "operator_key": "leiria_osm"},
    "portalegre":     {"name": "Portalegre",       "bbox": (38.9,-8.2,39.9,-6.9), "operator_key": "portalegre_osm"},
    "santarem":       {"name": "Santarem",         "bbox": (38.7,-9.2,39.7,-7.8), "operator_key": "santarem_osm"},
    "viana_castelo":  {"name": "Viana do Castelo", "bbox": (41.6,-8.9,42.2,-8.0), "operator_key": "viana_castelo_osm"},
    "vila_real":      {"name": "Vila Real",        "bbox": (41.1,-8.0,42.2,-6.8), "operator_key": "vila_real_osm"},
    "viseu":          {"name": "Viseu",            "bbox": (40.4,-8.1,41.2,-7.3), "operator_key": "viseu_osm"},
}


def overpass_query(query, ctx, timeout=90):
    encoded = urllib.parse.urlencode({"data": query}).encode()
    last_exc = None
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            req = urllib.request.Request(
                endpoint,
                data=encoded,
                headers={
                    "User-Agent": "GTFSPortugalMapper/1.0",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            r = urllib.request.urlopen(req, context=ctx, timeout=timeout)
            return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            last_exc = e
            continue
    raise last_exc


def build_query_bbox(bbox):
    """Query bus, trolleybus and share_taxi route relations in one request."""
    min_lat, min_lon, max_lat, max_lon = bbox
    bb = str(min_lat) + "," + str(min_lon) + "," + str(max_lat) + "," + str(max_lon)
    return (
        "[out:json][timeout:90];\n"
        "(\n"
        "  relation[\"type\"=\"route\"][\"route\"=\"bus\"](" + bb + ");\n"
        "  relation[\"type\"=\"route\"][\"route\"=\"trolleybus\"](" + bb + ");\n"
        "  relation[\"type\"=\"route\"][\"route\"=\"share_taxi\"](" + bb + ");\n"
        "  relation[\"type\"=\"route\"][\"route\"=\"minibus\"](" + bb + ");\n"
        ");\n"
        "out body;\n"
        ">;\n"
        "out skel qt;\n"
    )


def build_stops_query_bbox(bbox):
    min_lat, min_lon, max_lat, max_lon = bbox
    return (
        "[out:json][timeout:90];\n"
        "(\n"
        "  node[\"highway\"=\"bus_stop\"]"
        "(" + str(min_lat) + "," + str(min_lon) + "," + str(max_lat) + "," + str(max_lon) + ");\n"
        "  node[\"public_transport\"=\"platform\"]"
        "(" + str(min_lat) + "," + str(min_lon) + "," + str(max_lat) + "," + str(max_lon) + ");\n"
        ");\n"
        "out body;\n"
    )


def _sid(name, lat, lon):
    h = hashlib.md5(("{0}|{1:.5f}|{2:.5f}".format(name, lat, lon)).encode()).hexdigest()[:8]
    return "stop_" + h


def _rid(ref, name, idx):
    h = hashlib.md5(("{0}|{1}".format(ref, name)).encode()).hexdigest()[:6]
    return "route_{0}_{1}".format(h, idx)


def process_overpass_data(data, operator_key, district_name):
    elements = data.get("elements", [])
    nodes = {el["id"]: el for el in elements if el["type"] == "node"}
    stops_dict = {}
    routes_list = []
    shapes_list = []
    route_idx = 0
    for rel in elements:
        if rel["type"] != "relation":
            continue
        tags = rel.get("tags", {})
        if tags.get("route") not in ("bus", "trolleybus", "share_taxi", "minibus"):
            continue
        route_ref = str(tags.get("ref", tags.get("name", "route_" + str(route_idx))))
        route_name = tags.get("name", tags.get("ref", ""))
        route_id = _rid(route_ref, route_name, route_idx)
        route_idx += 1
        stop_ids = []
        for member in rel.get("members", []):
            if member.get("type") != "node":
                continue
            node = nodes.get(member.get("ref"))
            if node is None:
                continue
            nlat = node.get("lat")
            nlon = node.get("lon")
            if nlat is None or nlon is None:
                continue
            ntags = node.get("tags", {})
            stop_name = ntags.get("name", ntags.get("ref", "Stop_" + str(member["ref"])))
            mrole = member.get("role", "")
            is_stop = (
                ntags.get("public_transport") in ("stop_position", "platform")
                or ntags.get("highway") == "bus_stop"
                or mrole.startswith("stop")
                or mrole == "platform"
            )
            if not is_stop:
                continue
            sid = _sid(stop_name, nlat, nlon)
            if sid not in stops_dict:
                stops_dict[sid] = {"stop_id": sid, "stop_name": stop_name,
                                   "stop_lat": nlat, "stop_lon": nlon}
            stop_ids.append(sid)
        if not stop_ids:
            continue
        routes_list.append({"route_id": route_id, "route_short_name": route_ref,
                             "route_long_name": route_name, "route_type": 3, "stops": stop_ids})
        coords = [[stops_dict[s]["stop_lat"], stops_dict[s]["stop_lon"]]
                  for s in stop_ids if s in stops_dict]
        if coords:
            shapes_list.append({"shape_id": route_id, "coords": coords})
    stops_list = list(stops_dict.values())
    lats = [s["stop_lat"] for s in stops_list]
    lons = [s["stop_lon"] for s in stops_list]
    if lats:
        bbox_out = {"min_lat": min(lats), "max_lat": max(lats),
                    "min_lon": min(lons), "max_lon": max(lons)}
        center = {"lat": (min(lats)+max(lats))/2, "lon": (min(lons)+max(lons))/2}
    else:
        bbox_out = {}
        center = {}
    return {"operator_key": operator_key, "operator_name": district_name + " (OSM)",
            "stops": stops_list, "routes": routes_list, "shapes": shapes_list,
            "bbox": bbox_out, "center": center, "source": "OpenStreetMap Overpass API"}


def build_fallback_from_stops(stops_data, operator_key, district_name):
    elements = stops_data.get("elements", [])
    unique = {}
    for el in elements:
        if el.get("type") != "node":
            continue
        lat = el.get("lat")
        lon = el.get("lon")
        if lat is None or lon is None:
            continue
        tags = el.get("tags", {})
        name = tags.get("name", tags.get("ref", "Stop_" + str(el.get("id"))))
        sid = _sid(name, lat, lon)
        unique[sid] = {
            "stop_id": sid,
            "stop_name": name,
            "stop_lat": lat,
            "stop_lon": lon,
        }

    stops_list = sorted(unique.values(), key=lambda s: (s["stop_lat"], s["stop_lon"]))
    if len(stops_list) < 2:
        return {"operator_key": operator_key, "operator_name": district_name + " (OSM)",
                "stops": [], "routes": [], "shapes": [], "bbox": {}, "center": {},
                "source": "OpenStreetMap Overpass API (fallback stops)"}

    stop_ids = [s["stop_id"] for s in stops_list]
    coords = [[s["stop_lat"], s["stop_lon"]] for s in stops_list]
    route_id = "route_fallback_0"
    routes = [{
        "route_id": route_id,
        "route_short_name": "FB1",
        "route_long_name": district_name + " Fallback Route",
        "route_type": 3,
        "stops": stop_ids,
    }]
    shapes = [{"shape_id": route_id, "coords": coords}]

    lats = [s["stop_lat"] for s in stops_list]
    lons = [s["stop_lon"] for s in stops_list]
    bbox_out = {"min_lat": min(lats), "max_lat": max(lats), "min_lon": min(lons), "max_lon": max(lons)}
    center = {"lat": (min(lats) + max(lats)) / 2, "lon": (min(lons) + max(lons)) / 2}

    return {
        "operator_key": operator_key,
        "operator_name": district_name + " (OSM)",
        "stops": stops_list,
        "routes": routes,
        "shapes": shapes,
        "bbox": bbox_out,
        "center": center,
        "source": "OpenStreetMap Overpass API (fallback stops)",
    }


def _merge_standalone_stops(result, stops_data):
    """Add bus_stop nodes not already present in result stops."""
    existing_ids = {s["stop_id"] for s in result.get("stops", [])}
    elements = stops_data.get("elements", [])
    added = 0
    for el in elements:
        if el.get("type") != "node":
            continue
        lat = el.get("lat")
        lon = el.get("lon")
        if lat is None or lon is None:
            continue
        tags = el.get("tags", {})
        name = tags.get("name", tags.get("ref", "Stop_" + str(el.get("id"))))
        sid = _sid(name, lat, lon)
        if sid not in existing_ids:
            result["stops"].append({"stop_id": sid, "stop_name": name,
                                     "stop_lat": lat, "stop_lon": lon})
            existing_ids.add(sid)
            added += 1
    return added


def ingest_district(district_key, out_dir, ctx):
    info = DISTRICTS[district_key]
    print("[osm] Fetching " + info["name"] + " " + str(info["bbox"]) + "...")
    query = build_query_bbox(info["bbox"])
    data = None
    for attempt in range(1, 5):
        try:
            data = overpass_query(query, ctx, timeout=90)
            break
        except Exception as e:
            wait = attempt * 30
            print("[osm]   Attempt " + str(attempt) + " failed: " + str(e) + " -- waiting " + str(wait) + "s")
            time.sleep(wait)
    if data is None:
        print("[osm]   ERROR: All retries failed for " + info["name"])
        return {}
    result = process_overpass_data(data, info["operator_key"], info["name"])
    n_routes = len(result.get("routes", []))

    # Always augment with standalone bus_stop nodes
    print("[osm]   Fetching standalone stops for augmentation...")
    stops_query = build_stops_query_bbox(info["bbox"])
    try:
        stops_data = overpass_query(stops_query, ctx, timeout=90)
        if n_routes == 0:
            result = build_fallback_from_stops(stops_data, info["operator_key"], info["name"])
        else:
            added = _merge_standalone_stops(result, stops_data)
            print("[osm]   Added " + str(added) + " standalone stops")
    except Exception as e:
        print("[osm]   Stops augmentation failed: " + str(e))
        if n_routes == 0:
            print("[osm]   WARNING: No routes and no fallback stops for " + info["name"])

    n_stops = len(result.get("stops", []))
    n_routes = len(result.get("routes", []))
    n_shapes = len(result.get("shapes", []))
    print("[osm]   -> stops:" + str(n_stops) + ", routes:" + str(n_routes) + ", shapes:" + str(n_shapes))
    if n_routes == 0:
        print("[osm]   WARNING: No usable data found for " + info["name"])

    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, district_key + "_osm_synthetic.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)
    size_kb = os.path.getsize(out_path) / 1024
    print("[osm]   Saved " + out_path + " (" + str(round(size_kb, 1)) + " KB)")
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--district", default="aveiro")
    p.add_argument("--out-dir", default="experiments/results")
    p.add_argument("--delay", type=float, default=5.0)
    args = p.parse_args()
    ctx = ssl._create_unverified_context()
    if args.district == "all":
        keys = list(DISTRICTS.keys())
    elif args.district in DISTRICTS:
        keys = [args.district]
    else:
        print("Unknown district: " + args.district)
        sys.exit(1)
    for i, key in enumerate(keys):
        ingest_district(key, args.out_dir, ctx)
        if i < len(keys) - 1:
            print("[osm] Waiting " + str(args.delay) + "s...")
            time.sleep(args.delay)
    print("[osm] Done.")


if __name__ == "__main__":
    main()
