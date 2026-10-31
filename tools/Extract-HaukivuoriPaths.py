"""Retained Finland PBF -> named Rantalantie and nearby publicly mapped walking ways."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / ".tools/osm-python"))
import osmium

OUT = ROOT / ".tools/finland-source"
BLOCKED = {"no", "private", "customers", "permit", "destination", "delivery", "agricultural", "forestry"}

class Paths(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.roads = []
        self.ways = []

    def way(self, way):
        kind = way.tags.get("highway")
        if kind not in {"footway", "path", "pedestrian", "steps", "cycleway", "residential", "living_street", "unclassified", "track", "service"}:
            return
        points = [{"lat": n.lat, "lon": n.lon, "nodeId": n.ref} for n in way.nodes if n.location.valid()]
        if not points or not any(62.075 < p["lat"] < 62.165 and 27.0 < p["lon"] < 27.16 for p in points):
            return
        tags = dict(way.tags)
        value = {"id": way.id, "tags": tags, "geometry": points}
        if tags.get("name") == "Rantalantie":
            self.roads.append(value)
        if tags.get("access") in BLOCKED or tags.get("foot") in BLOCKED:
            return
        if tags.get("service") in {"driveway", "parking_aisle"} or tags.get("motorroad") == "yes":
            return
        if kind == "cycleway" and tags.get("foot") not in {"yes", "designated", "permissive"}:
            return
        if tags.get("indoor") not in {None, "no"} or tags.get("tunnel") not in {None, "no"} or tags.get("covered") == "yes" or tags.get("area") == "yes":
            return
        self.ways.append(value)

handler = Paths()
handler.apply_file(str(OUT / "finland.osm.pbf"), locations=True, idx="sparse_file_array," + str(OUT / "haukivuori-node-cache"))
if not any(r["id"] == 1156889836 for r in handler.roads):
    raise RuntimeError("Exact geocoded Rantalantie not present in source")
(OUT / "haukivuori-paths.json").write_text(json.dumps({"roads": handler.roads, "ways": handler.ways}), encoding="utf-8")
print("Rantalantie segments:", [(r["id"], r["tags"]) for r in handler.roads], flush=True)
print("Nearby eligible ways:", len(handler.ways), flush=True)
