"""Read-only TR-094 audit of the pinned public Haukkala routing chunk."""
import argparse
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path


def inspect(root):
    manifest_bytes = (root / 'manifest.json').read_bytes()
    if hashlib.sha256(manifest_bytes).hexdigest() != 'e16d062504f74c74585ac1538654daedac7cb74add4015f4d217bb6c8104e295':
        raise ValueError('Use the retained canonical Finland manifest')
    manifest = json.loads(manifest_bytes)
    key = '1245_256'
    data = (root / (key + '.json.gz')).read_bytes()
    if hashlib.sha256(data).hexdigest() != manifest['chunks'][key]['sha256']:
        raise ValueError('Canonical chunk checksum mismatch')
    chunk = json.loads(gzip.decompress(data))
    edges = chunk['edges']
    points, links = {}, collections.defaultdict(set)
    for edge in edges:
        if not (edge['f'] | edge['b']) & 2:
            continue
        for p in edge['points']:
            points[p[0]] = p
        for a, b in zip(edge['points'], edge['points'][1:]):
            if edge['f'] & 2:
                links[a[0]].add(b[0])
            if edge['b'] & 2:
                links[b[0]].add(a[0])
    def meters(p):
        lat, lon = math.radians(p[1] / 1e7), math.radians(p[2] / 1e7)
        a, b = math.radians(62.271751), math.radians(25.6961095)
        return 12742000 * math.asin(math.sqrt(math.sin((lat-a)/2)**2 + math.cos(lat)*math.cos(a)*math.sin((lon-b)/2)**2))
    start = min(points, key=lambda n: meters(points[n]))
    reachable, queue = {start}, [start]
    for n in queue:
        for to in links[n]:
            if to not in reachable:
                reachable.add(to)
                queue.append(to)
    # Every component node is strictly inside this cell; incident ways are
    # replicated into every touched cell by the retained canonical exporter.
    if any(p[1] // 500000 != 1245 or p[2] // 1000000 != 256 for n in reachable for p in [points[n]]):
        raise ValueError('Component reaches audit boundary; load adjacent data before concluding')
    touching = [e for e in edges if any(p[0] in reachable for p in e['points'])]
    return {'sourceManifestSha256': hashlib.sha256(manifest_bytes).hexdigest(),
            'chunk': key, 'chunkSha256': hashlib.sha256(data).hexdigest(),
            'policy': manifest['policy'], 'nearestBicycleNode': start,
            'offsetMeters': round(meters(points[start]), 3),
            'reachableBicycleNodes': sorted(reachable),
            'incidentWays': [{'id': e['id'], 'way': e['way'], 'forward': e['f'],
                              'backward': e['b'], 'tags': e['tags']} for e in touching],
            'interpretation': 'Foot-only connector in the retained conservative graph; no real-world legal access claim.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--network', type=Path, default=Path('.tools/finland-routing-dev-1'))
    args = parser.parse_args()
    print(json.dumps(inspect(args.network), ensure_ascii=False, indent=2))
