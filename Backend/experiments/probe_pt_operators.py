#!/usr/bin/env python3
"""Test various Portuguese transport API and GTFS sources, including Moverick municipalities."""
import urllib.request, ssl, json

ctx = ssl._create_unverified_context()

urls = [
    ('MUVI Viseu homepage', 'https://www.muvi.pt/'),
    ('MUVI GTFS zip', 'https://www.muvi.pt/gtfs/muvi.zip'),
    ('TUG Guarda homepage', 'https://www.tug.pt/'),
    ('TUG GTFS', 'https://www.tug.pt/gtfs/tug.zip'),
    ('Moverick RodoAmarante stops', 'https://api.moverick.es/topology/stops?municipality_id=60fe6761&limit=50'),
    ('Moverick Albufeira lines', 'https://api.moverick.es/topology/lines?municipality_id=636e0e0d&limit=20'),
    ('Moverick Lagos lines', 'https://api.moverick.es/topology/lines?municipality_id=62fb92e5&limit=20'),
    ('Moverick Portimao lines', 'https://api.moverick.es/topology/lines?municipality_id=62946d37&limit=20'),
    ('Moverick Olhao lines', 'https://api.moverick.es/topology/lines?municipality_id=608fa960&limit=20'),
]

for name, url in urls:
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        if 'moverick' in url:
            headers['X-API-Key'] = '1469e6cb-d4fe-4619-af60-139519a2994a'
        req = urllib.request.Request(url, headers=headers)
        r = urllib.request.urlopen(req, context=ctx, timeout=8)
        ct = r.headers.get('Content-Type', '')[:50]
        content = r.read()
        print(f'OK   {r.status} {name}: {len(content)}b ct={ct}')
        if 'moverick' in url:
            obj = json.loads(content)
            items = obj if isinstance(obj, list) else obj.get('data', [])
            print(f'     -> {len(items)} items')
            for it in items[:3]:
                if 'stops' in name:
                    coords = it.get('coordinates', [0, 0])
                    lat = coords[1] if len(coords) > 1 else '?'
                    lon = coords[0] if len(coords) > 0 else '?'
                    print(f'       stop: {it.get("name","?")} lat={lat} lon={lon}')
                else:
                    print(f'       line: {it.get("name","?")} mode={it.get("mode","?")}')
    except Exception as e:
        print(f'FAIL {name}: {e}')
