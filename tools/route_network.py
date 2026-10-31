"""TR-094 offline routing input. No player data, network calls or reward writes.

Conservative OSM subset, not an access/safety certification. Compression only
removes degree-two vertices from topology; every mapped geometry point survives.
"""
import gzip
import hashlib
import json
import math
import sqlite3
from collections import Counter
from pathlib import Path

POLICY = "finland-paths-dev-1"
FOOT, BICYCLE = 1, 2
ALLOW = {"yes", "designated", "permissive", "official"}
KINDS = {"footway", "path", "pedestrian", "steps", "cycleway", "residential",
         "living_street", "unclassified", "service", "track"}
ACCESS_KEYS = {"access", "foot", "bicycle", "vehicle", "opening_hours",
               "barrier", "locked", "ford", "seasonal", "winter_road",
               "ice_road", "construction", "proposed"}


def dumps(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def permission(tags, mode, default):
    keys = (mode, "vehicle", "access") if mode == "bicycle" else (mode, "access")
    for key in keys:
        if key in tags:
            return tags[key] in ALLOW
    return default


def uncertain(tags):
    # Do not silently interpret time/season/conditional access or direction.
    return any(":conditional" in key and key.split(":")[0] in
               {"access", "foot", "bicycle", "vehicle", "oneway", "restriction"}
               for key in tags) or any(tags.get(key) not in (None, "no") for key in
               ("opening_hours", "seasonal", "winter_road", "ice_road", "construction", "proposed"))


def direction(tags, mode):
    value = tags.get("oneway:" + mode)
    if value is None:
        # A general oneway is ambiguous on paths: conservatively honour it.
        value = tags.get("oneway", "no") if mode == "bicycle" or tags.get("highway") in {
            "steps", "path", "footway", "cycleway"} else "no"
        if mode == "bicycle" and tags.get("junction") == "roundabout" and "oneway" not in tags:
            value = "yes"
    if value not in {"yes", "1", "-1", "no", "0", "false"}:
        return False, False
    forward, backward = value != "-1", value not in {"yes", "1"}
    for suffix in ("forward", "backward"):
        # The more specific mode restriction takes precedence over generic access.
        allowed = permission({key: tags[key + ":" + suffix] for key in
                              ("access", "vehicle", "foot", "bicycle")
                              if key + ":" + suffix in tags}, mode, True)
        if suffix == "forward":
            forward &= allowed
        else:
            backward &= allowed
    return forward, backward


def way_modes(tags):
    kind = tags.get("highway")
    if kind not in KINDS or uncertain(tags):
        return 0, 0
    if any(tags.get(key) not in (None, "no") for key in
           ("indoor", "tunnel", "covered", "area", "informal", "motorroad", "ford")):
        return 0, 0
    if tags.get("service") in {"driveway", "parking_aisle", "drive-through", "emergency_access"}:
        return 0, 0
    if tags.get("sac_scale") not in {None, "hiking"}:
        return 0, 0
    forward = backward = 0
    for mode, bit in (("foot", FOOT), ("bicycle", BICYCLE)):
        default = kind != "cycleway" if mode == "foot" else kind in {
            "cycleway", "residential", "living_street", "unclassified", "service"}
        if mode == "bicycle" and kind == "steps":
            continue  # no dismount/pushing or stair traversal in this version
        if not permission(tags, mode, default):
            continue
        fwd, back = direction(tags, mode)
        forward |= bit if fwd else 0
        backward |= bit if back else 0
    return forward, backward


def node_blocked_modes(tags):
    if uncertain(tags) or any(tags.get(key) not in (None, "no") for key in
                              ("locked", "ford", "construction", "proposed")):
        return FOOT | BICYCLE
    barrier = tags.get("barrier") not in (None, "no", "entrance")
    blocked = 0
    for mode, bit in (("foot", FOOT), ("bicycle", BICYCLE)):
        # Unknown gates/barriers are excluded unless that mode is explicitly allowed.
        if not permission(tags, mode, not barrier):
            blocked |= bit
    return blocked


def cell(point):
    return f"{point[1] // 500000}_{point[2] // 1000000}"


def meters(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (a[1] / 1e7, a[2] / 1e7, b[1] / 1e7, b[2] / 1e7))
    q = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 12742000 * math.asin(min(1, math.sqrt(q)))


def edge_cells(points):
    result = set()
    for a, b in zip(points, points[1:]):
        y1, y2 = sorted((a[1] // 500000, b[1] // 500000))
        x1, x2 = sorted((a[2] // 1000000, b[2] // 1000000))
        # Bbox over-inclusion is intentional: it never creates connectivity.
        for y in range(y1, y2 + 1):
            for x in range(x1, x2 + 1):
                result.add(f"{y}_{x}")
    return sorted(result)


class NetworkBuilder:
    def __init__(self, database):
        # Refuse existing files before changing any SQLite pragmas/schema.
        with Path(database).open("xb"):
            pass
        self.db = sqlite3.connect(database)
        self.db.executescript("""
          PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA temp_store=FILE;
          CREATE TABLE ways(id INTEGER PRIMARY KEY, f INTEGER, b INTEGER, tags TEXT, points TEXT);
          CREATE TABLE refs(id INTEGER PRIMARY KEY, count INTEGER NOT NULL);
          CREATE TABLE edges(id TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE cells(cell TEXT NOT NULL, edge TEXT NOT NULL, PRIMARY KEY(cell,edge));
        """)
        self.stats = Counter()

    def add_way(self, way_id, tags, points, blocked_nodes=None, restricted=False):
        self.stats["seenWays"] += 1
        if restricted:
            self.stats["restrictionWaysExcluded"] += 1
            return
        fwd, back = way_modes(tags)
        if not (fwd | back):
            return
        if len(points) < 2 or any(p is None for p in points):
            self.stats["missingGeometryWays"] += 1
            return
        if any(len(p) != 3 or any(type(v) is not int for v in p) or p[0] <= 0 or not -900000000 <= p[1] <= 900000000
               or not -1800000000 <= p[2] <= 1800000000 for p in points):
            raise ValueError("Invalid mapped node")
        # Don't join across missing nodes, implausibly long geometry gaps, or any
        # restricted node on a way. Whole-mode exclusion deliberately loses routes.
        if any(a[0] == b[0] or meters(a, b) > 20000 for a, b in zip(points, points[1:])):
            self.stats["invalidGeometryWays"] += 1
            return
        for p in points:
            blocked = (blocked_nodes or {}).get(p[0], 0)
            fwd &= ~blocked
            back &= ~blocked
        if not (fwd | back):
            self.stats["nodeBlockedWays"] += 1
            return
        keep = {key: tags[key] for key in ("highway", "surface", "smoothness", "tracktype",
                "sac_scale", "incline", "wheelchair", "width", "lit", "name", "bridge") if key in tags}
        self.db.execute("INSERT INTO ways VALUES (?,?,?,?,?)", (way_id, fwd, back, dumps(keep), dumps(points)))
        counts = Counter(p[0] for p in points)
        counts[points[0][0]] += 1
        counts[points[-1][0]] += 1
        self.db.executemany("INSERT INTO refs VALUES (?,?) ON CONFLICT(id) DO UPDATE SET count=count+excluded.count",
                            counts.items())
        self.stats["acceptedWays"] += 1
        self.stats["geometryPoints"] += len(points)
        if self.stats["acceptedWays"] % 10000 == 0:
            self.db.commit()

    def compress(self):
        self.db.commit()
        for way_id, fwd, back, tags, raw in self.db.execute("SELECT * FROM ways ORDER BY id"):
            points = json.loads(raw)
            # Query once per way; keep memory independent of Finland's node count.
            counts = {}
            for offset in range(0, len(points), 500):
                ids = [p[0] for p in points[offset:offset + 500]]
                counts.update(self.db.execute("SELECT id,count FROM refs WHERE id IN (" +
                                             ",".join("?" for _ in ids) + ")", ids))
            start, length, number = 0, 0.0, 0
            for i in range(1, len(points)):
                length += meters(points[i - 1], points[i])
                if (i == len(points) - 1 or counts[points[i][0]] > 1 or
                        cell(points[i]) != cell(points[i - 1]) or length >= 2000):
                    geometry = points[start:i + 1]
                    key = f"{way_id}:{number}"
                    value = {"id": key, "way": way_id, "f": fwd, "b": back,
                             "meters": round(length, 3), "tags": json.loads(tags), "points": geometry}
                    self.db.execute("INSERT INTO edges VALUES (?,?)", (key, dumps(value)))
                    self.db.executemany("INSERT INTO cells VALUES (?,?)", ((c, key) for c in edge_cells(geometry)))
                    self.stats["edges"] += 1
                    start, length, number = i, 0.0, number + 1
            if self.stats["edges"] % 10000 == 0:
                self.db.commit()
        self.db.commit()

    def export(self, output, source):
        output = Path(output)
        output.mkdir(exist_ok=False, parents=True)
        chunks = {}
        for (key,) in self.db.execute("SELECT DISTINCT cell FROM cells ORDER BY cell"):
            values = [json.loads(row[0]) for row in self.db.execute(
                "SELECT value FROM cells JOIN edges ON edge=id WHERE cell=? ORDER BY id", (key,))]
            raw = dumps({"version": 1, "policy": POLICY, "cell": key, "edges": values}).encode()
            compressed = gzip.compress(raw, mtime=0)
            (output / (key + ".json.gz")).write_bytes(compressed)
            chunks[key] = {"sha256": hashlib.sha256(compressed).hexdigest(),
                           "bytes": len(compressed), "decodedBytes": len(raw), "edges": len(values)}
        manifest = {"version": 1, "policy": POLICY, "coordinates": "OSM node ID, WGS84 latitude E7, longitude E7",
                    "cellDegrees": [0.05, 0.1], "source": source, "counts": dict(self.stats), "chunks": chunks,
                    "attribution": "© OpenStreetMap contributors", "license": "ODbL-1.0",
                    "limitations": ["Mapped access is not field verified", "Unknown barriers and conditional access excluded",
                                    "Ways in restriction relations excluded", "No wheelchair accessibility inference",
                                    "No live closures, elevation, turn cues or winter suitability"]}
        (output / "manifest.json").write_text(dumps(manifest), encoding="utf-8")
        return manifest
