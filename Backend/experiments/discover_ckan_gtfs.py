#!/usr/bin/env python3
"""Discover GTFS ZIP resources from likely Portuguese CKAN portals."""

from __future__ import annotations

import json
import re
import ssl
import urllib.request
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class PortalResult:
    domain: str
    endpoint: str | None
    ok: bool
    dataset_count: int
    zip_urls: list[str]
    error: str | None = None


PORTALS = [
    "opendata.porto.digital",
    "opendata.cm-coimbra.pt",
    "opendata.cm-aveiro.pt",
    "opendata.cm-leiria.pt",
    "opendata.cm-viseu.pt",
    "opendata.cm-viana-castelo.pt",
    "opendata.cm-evora.pt",
    "opendata.cm-beja.pt",
    "opendata.cm-faro.pt",
    "opendata.cm-guarda.pt",
    "dadosabertos.cm-aveiro.pt",
    "dadosabertos.cm-leiria.pt",
    "dadosabertos.cm-viseu.pt",
    "dadosabertos.cm-faro.pt",
    "dadosabertos.cm-evora.pt",
    "dados.gov.pt",
]

ENDPOINTS = [
    "https://{domain}/api/3/action/package_search?q=gtfs",
    "https://{domain}/pt/api/3/action/package_search?q=gtfs",
]

ZIP_PATTERN = re.compile(r'https://[^"\\]+/download/[^"\\]+\\.zip', re.IGNORECASE)


def fetch(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (GTFS discovery script)",
            "Accept": "application/json,text/plain,*/*",
        },
    )
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return resp.read().decode("utf-8", errors="replace")


def scan_portal(domain: str) -> PortalResult:
    errors: list[str] = []
    for tmpl in ENDPOINTS:
        endpoint = tmpl.format(domain=domain)
        try:
            body = fetch(endpoint)
            if '"success": true' not in body and '"success":true' not in body:
                errors.append(f"not-ckan-response:{endpoint}")
                continue

            count = 0
            m = re.search(r'"count"\s*:\s*(\d+)', body)
            if m:
                count = int(m.group(1))

            zip_urls = sorted(set(ZIP_PATTERN.findall(body)))
            return PortalResult(
                domain=domain,
                endpoint=endpoint,
                ok=True,
                dataset_count=count,
                zip_urls=zip_urls,
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{endpoint}: {exc}")

    return PortalResult(
        domain=domain,
        endpoint=None,
        ok=False,
        dataset_count=0,
        zip_urls=[],
        error=" | ".join(errors[:3]) if errors else "unknown",
    )


def main() -> int:
    results = [scan_portal(p) for p in PORTALS]

    print("GTFS CKAN Discovery Results")
    print("=" * 60)
    for r in results:
        if r.ok:
            print(f"OK   {r.domain:30} datasets={r.dataset_count:3} zips={len(r.zip_urls):2}")
            for u in r.zip_urls[:8]:
                print(f"     - {u}")
            if len(r.zip_urls) > 8:
                print(f"     ... +{len(r.zip_urls)-8} more")
        else:
            print(f"MISS {r.domain:30} {r.error}")

    out = Path(__file__).resolve().parent / "results" / "gtfs_ckan_discovery_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nSaved:", out)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
