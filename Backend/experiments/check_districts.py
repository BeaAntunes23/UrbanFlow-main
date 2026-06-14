#!/usr/bin/env python3
import json

data = json.load(open('Frontend/public/data/gtfs_map_latest.json', encoding='utf-8'))
print('Operators with district field:')
for op in data['operators']:
    district = op.get('district', 'N/A')
    print(f"  {op['key']:25} → {district}")
