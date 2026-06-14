#!/usr/bin/env python3
"""Validate and summarize a GTFS feed (zip or folder).

Usage examples:
  python experiments/gtfs_validate_and_summarize.py --gtfs "C:/data/porto_gtfs.zip"
  python experiments/gtfs_validate_and_summarize.py --gtfs "C:/data/gtfs_folder" --date 20260316
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import os
import zipfile
from collections import Counter
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Set, Tuple


REQUIRED_FILES = {
    "agency.txt",
    "stops.txt",
    "routes.txt",
    "trips.txt",
    "stop_times.txt",
}

CALENDAR_OPTIONAL_GROUP = {"calendar.txt", "calendar_dates.txt"}

WEEKDAY_FIELD = {
    0: "monday",
    1: "tuesday",
    2: "wednesday",
    3: "thursday",
    4: "friday",
    5: "saturday",
    6: "sunday",
}


@dataclass
class GTFSDataSource:
    base_path: str
    is_zip: bool
    members: Set[str]

    def open_text(self, name: str) -> io.TextIOBase:
        if self.is_zip:
            zf = zipfile.ZipFile(self.base_path)
            member = _find_member_name(self.members, name)
            if member is None:
                zf.close()
                raise FileNotFoundError(name)
            raw = zf.open(member, "r")
            return io.TextIOWrapper(_ZipClosingReader(raw, zf), encoding="utf-8-sig", newline="")

        path = os.path.join(self.base_path, name)
        return open(path, "r", encoding="utf-8-sig", newline="")


class _ZipClosingReader(io.BufferedReader):
    """Close the zipfile when the stream closes."""

    def __init__(self, raw, zip_file: zipfile.ZipFile):
        super().__init__(raw)
        self._zip_file = zip_file

    def close(self) -> None:
        try:
            super().close()
        finally:
            self._zip_file.close()


def _normalize_member_name(path: str) -> str:
    return path.replace("\\", "/").split("/")[-1].lower()


def _find_member_name(members: Set[str], target: str) -> Optional[str]:
    target_l = target.lower()
    for member in members:
        if _normalize_member_name(member) == target_l:
            return member
    return None


def detect_source(gtfs_path: str) -> GTFSDataSource:
    if not os.path.exists(gtfs_path):
        raise FileNotFoundError(f"GTFS path not found: {gtfs_path}")

    if os.path.isdir(gtfs_path):
        files = {
            os.path.join(root, f)
            for root, _, names in os.walk(gtfs_path)
            for f in names
        }
        return GTFSDataSource(base_path=gtfs_path, is_zip=False, members=files)

    if zipfile.is_zipfile(gtfs_path):
        with zipfile.ZipFile(gtfs_path, "r") as zf:
            members = set(zf.namelist())
        return GTFSDataSource(base_path=gtfs_path, is_zip=True, members=members)

    raise ValueError("GTFS input must be a folder or a .zip file")


def read_csv_rows(source: GTFSDataSource, file_name: str) -> List[Dict[str, str]]:
    with source.open_text(file_name) as fp:
        reader = csv.DictReader(fp)
        return [row for row in reader]


def parse_service_ids_for_date(source: GTFSDataSource, target_date: dt.date) -> Set[str]:
    service_ids: Set[str] = set()
    has_calendar = _find_member_name(source.members, "calendar.txt") is not None
    has_calendar_dates = _find_member_name(source.members, "calendar_dates.txt") is not None

    ymd = target_date.strftime("%Y%m%d")

    if has_calendar:
        rows = read_csv_rows(source, "calendar.txt")
        weekday_col = WEEKDAY_FIELD[target_date.weekday()]
        for row in rows:
            if row.get(weekday_col) != "1":
                continue
            if row.get("start_date", "") <= ymd <= row.get("end_date", ""):
                sid = row.get("service_id", "").strip()
                if sid:
                    service_ids.add(sid)

    if has_calendar_dates:
        rows = read_csv_rows(source, "calendar_dates.txt")
        for row in rows:
            if row.get("date") != ymd:
                continue
            sid = row.get("service_id", "").strip()
            ex = row.get("exception_type", "").strip()
            if not sid or ex not in {"1", "2"}:
                continue
            if ex == "1":
                service_ids.add(sid)
            else:
                service_ids.discard(sid)

    return service_ids


def safe_hour_from_gtfs_time(value: str) -> Optional[int]:
    if not value:
        return None
    parts = value.split(":")
    if len(parts) < 2:
        return None
    try:
        hour = int(parts[0])
    except ValueError:
        return None
    return max(0, min(hour, 47))


def validate_structure(source: GTFSDataSource) -> Dict[str, object]:
    present = {_normalize_member_name(m) for m in source.members}
    missing_required = sorted(f for f in REQUIRED_FILES if f not in present)

    has_calendar_support = any(f in present for f in CALENDAR_OPTIONAL_GROUP)
    warnings: List[str] = []
    if not has_calendar_support:
        warnings.append(
            "Neither calendar.txt nor calendar_dates.txt was found. "
            "Date-based filtering may be incomplete."
        )

    return {
        "required_files_ok": len(missing_required) == 0,
        "missing_required_files": missing_required,
        "has_calendar_or_calendar_dates": has_calendar_support,
        "warnings": warnings,
    }


def build_summary(source: GTFSDataSource, target_date: dt.date) -> Dict[str, object]:
    structure = validate_structure(source)
    if not structure["required_files_ok"]:
        return {
            "ok": False,
            "date": target_date.isoformat(),
            "validation": structure,
            "error": "Missing required GTFS files",
        }

    routes = read_csv_rows(source, "routes.txt")
    trips = read_csv_rows(source, "trips.txt")
    stops = read_csv_rows(source, "stops.txt")
    stop_times = read_csv_rows(source, "stop_times.txt")

    service_ids_active = parse_service_ids_for_date(source, target_date)
    trip_service_by_id = {t.get("trip_id", ""): t.get("service_id", "") for t in trips if t.get("trip_id")}

    if service_ids_active:
        active_trip_ids = {
            trip_id
            for trip_id, sid in trip_service_by_id.items()
            if sid in service_ids_active
        }
    else:
        # Fallback when calendar data is missing: use all trips.
        active_trip_ids = set(trip_service_by_id.keys())

    departures_by_hour = Counter()
    for st in stop_times:
        trip_id = st.get("trip_id", "")
        if trip_id not in active_trip_ids:
            continue
        if st.get("stop_sequence", "") != "1":
            continue
        hour = safe_hour_from_gtfs_time(st.get("departure_time", ""))
        if hour is not None:
            departures_by_hour[str(hour)] += 1

    route_types = Counter(r.get("route_type", "unknown") for r in routes)

    return {
        "ok": True,
        "date": target_date.isoformat(),
        "validation": structure,
        "counts": {
            "stops": len(stops),
            "routes": len(routes),
            "trips": len(trips),
            "stop_times": len(stop_times),
            "active_services": len(service_ids_active),
            "active_trips": len(active_trip_ids),
        },
        "route_types": dict(route_types),
        "departures_by_hour": {
            str(h): departures_by_hour.get(str(h), 0) for h in range(0, 24)
        },
        "notes": [
            "departures_by_hour counts only first stop of each active trip (stop_sequence=1)",
            "if calendar files are missing, active trips fallback to all trips",
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate and summarize GTFS feed")
    parser.add_argument("--gtfs", required=True, help="Path to GTFS .zip or folder")
    parser.add_argument(
        "--date",
        help="Date for service filtering in YYYYMMDD (default: today)",
    )
    parser.add_argument(
        "--out",
        default="Backend/experiments/results/gtfs_summary_latest.json",
        help="Output JSON path",
    )
    return parser.parse_args()


def parse_date(value: Optional[str]) -> dt.date:
    if not value:
        return dt.date.today()
    try:
        return dt.datetime.strptime(value, "%Y%m%d").date()
    except ValueError as exc:
        raise ValueError("--date must use YYYYMMDD format") from exc


def main() -> int:
    args = parse_args()
    target_date = parse_date(args.date)
    source = detect_source(args.gtfs)
    summary = build_summary(source, target_date)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fp:
        json.dump(summary, fp, indent=2, ensure_ascii=False)

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"\nSaved: {args.out}")
    return 0 if summary.get("ok") else 2


if __name__ == "__main__":
    raise SystemExit(main())
