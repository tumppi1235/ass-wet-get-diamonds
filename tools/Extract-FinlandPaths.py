"""Offline public walking-path extracts from the official Geofabrik Finland PBF.
Install pyosmium in .tools/osm-python. No player locations or online queries.
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / ".tools/osm-python"))
import osmium  # noqa: E402

OUT = ROOT / ".tools/finland-source"
CITIES = json.loads((ROOT / "tools/finland-places.json").read_text(encoding="utf-8"))
BLOCKED = {"no", "private", "customers", "permit", "destination", "delivery", "agricultural", "forestry"}


class Paths(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.groups = [[] for _ in CITIES]
        self.count = 0
        self.rural = {}

    def way(self, way):
        kind = way.tags.get("highway")
        if kind not in {"footway", "path", "pedestrian", "steps", "cycleway"}:
            return
        tags = dict(way.tags)
        if tags.get("access") in BLOCKED or tags.get("foot") in BLOCKED:
            return
        if kind == "cycleway" and tags.get("foot") not in {"yes", "designated", "permissive"}:
            return
        if tags.get("indoor") not in {None, "no"} or tags.get("tunnel") not in {None, "no"}:
            return
        if tags.get("covered") == "yes" or tags.get("area") == "yes" or tags.get("informal") == "yes":
            return
        if tags.get("sac_scale") not in {None, "hiking", "mountain_hiking"}:
            return
        points = [{"lat": n.lat, "lon": n.lon, "nodeId": n.ref} for n in way.nodes if n.location.valid()]
        if len(points) < 2:
            return
        for p in (points[0], points[len(points)//2], points[-1]):
            key = (math.floor(p["lat"]/.5), math.floor(p["lon"]))
            rank = ((way.id*2654435761) ^ (p["nodeId"]*2246822519)) & 0xffffffff
            candidates = self.rural.setdefault(key, [])
            if not any(c["point"]["nodeId"] == p["nodeId"] for c in candidates):
                candidates.append({"id": way.id, "tags": tags, "point": p, "rank": rank})
                candidates.sort(key=lambda c: c["rank"])
                del candidates[2:]
        for index, (_, lat, lon) in enumerate(CITIES):
            if any(abs(p["lat"]-lat) < .022 and abs(p["lon"]-lon) < .055 for p in points):
                self.groups[index].append({"id": way.id, "tags": tags, "geometry": points})
        self.count += 1
        if self.count % 20000 == 0:
            print("Read", self.count, "eligible outdoor paths", flush=True)


handler = Paths()
handler.apply_file(str(OUT / "finland.osm.pbf"), locations=True,
                   idx="sparse_file_array," + str(OUT / "node-cache"))
for (name, _, _), ways in zip(CITIES, handler.groups):
    print(name, len(ways), "public-path ways", flush=True)
(OUT / "city-paths.json").write_text(json.dumps({"cities": [
    {"name": city[0], "latitude": city[1], "longitude": city[2], "ways": ways}
    for city, ways in zip(CITIES, handler.groups)
], "rural": [candidate for candidates in handler.rural.values() for candidate in candidates]}), encoding="utf-8")
