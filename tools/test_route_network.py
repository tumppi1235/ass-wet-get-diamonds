"""Topology/access regressions use synthetic maps, never player GPS or rewards."""
import gzip
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from route_network import (BICYCLE, FOOT, NetworkBuilder, cell, edge_cells,
                           meters, node_blocked_modes, way_modes)

ROOT = Path(__file__).resolve().parent.parent
TEMP = ROOT / ".tools/route-tests"
TEMP.mkdir(parents=True, exist_ok=True)
AUDIT_SPEC = importlib.util.spec_from_file_location("route_audit", ROOT / "tools/Inspect-RouteNetwork.py")
AUDIT = importlib.util.module_from_spec(AUDIT_SPEC)
AUDIT_SPEC.loader.exec_module(AUDIT)


def point(node, lat=620000000, lon=250000000):
    return [node, lat, lon]


class AccessTests(unittest.TestCase):
    def test_modes_and_specific_access_precedence(self):
        self.assertEqual(way_modes({"highway": "residential"}), (3, 3))
        self.assertEqual(way_modes({"highway": "cycleway"}), (2, 2))
        self.assertEqual(way_modes({"highway": "path"}), (1, 1))
        self.assertEqual(way_modes({"highway": "path", "access": "private", "foot": "yes"}), (1, 1))
        self.assertEqual(way_modes({"highway": "residential", "vehicle": "no"}), (1, 1))
        self.assertEqual(way_modes({"highway": "residential", "vehicle": "no", "bicycle": "yes"}), (3, 3))
        for value in ("no", "private", "customers", "permit", "destination", "delivery", "unknown", "use_sidepath"):
            self.assertEqual(way_modes({"highway": "path", "foot": value}), (0, 0))

    def test_uncertain_and_unsuitable_paths_are_excluded(self):
        for key, value in (("access:conditional", "no @ (Mo-Fr)"), ("oneway:bicycle:conditional", "yes @ (Mo-Fr)"),
                           ("opening_hours", "24/7"), ("seasonal", "yes"), ("ford", "yes"),
                           ("tunnel", "yes"), ("area", "yes"), ("service", "driveway"),
                           ("sac_scale", "demanding_mountain_hiking"), ("informal", "yes")):
            self.assertEqual(way_modes({"highway": "residential", key: value}), (0, 0), key)
        for kind in ("motorway", "trunk", "primary", "secondary", "tertiary", "construction", "proposed"):
            self.assertEqual(way_modes({"highway": kind, "foot": "yes"}), (0, 0))
        self.assertEqual(way_modes({"highway": "steps", "bicycle": "yes"}), (1, 1))

    def test_direction_is_mode_specific_and_never_invented(self):
        self.assertEqual(way_modes({"highway": "residential", "oneway": "yes"}), (3, 1))
        self.assertEqual(way_modes({"highway": "residential", "oneway": "-1"}), (1, 3))
        self.assertEqual(way_modes({"highway": "residential", "oneway": "yes", "oneway:bicycle": "no"}), (3, 3))
        self.assertEqual(way_modes({"highway": "path", "oneway": "yes"}), (1, 0))
        self.assertEqual(way_modes({"highway": "path", "oneway:foot": "alternating"}), (0, 0))
        self.assertEqual(way_modes({"highway": "residential", "junction": "roundabout"}), (3, 1))
        self.assertEqual(way_modes({"highway": "residential", "foot:forward": "no", "vehicle:backward": "no"}), (2, 1))

    def test_node_barriers_never_use_way_access_as_an_override(self):
        self.assertEqual(node_blocked_modes({"barrier": "gate"}), 3)
        self.assertEqual(node_blocked_modes({"barrier": "gate", "foot": "yes"}), BICYCLE)
        self.assertEqual(node_blocked_modes({"access": "private", "bicycle": "yes"}), FOOT)
        self.assertEqual(node_blocked_modes({"barrier": "gate", "foot": "yes", "locked": "yes"}), 3)
        self.assertEqual(node_blocked_modes({"foot:conditional": "no @ (sunset-sunrise)"}), 3)
        self.assertEqual(node_blocked_modes({"barrier": "no"}), 0)


class GraphTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=TEMP)
        self.directory = Path(self.temp.name)
        self.builder = NetworkBuilder(self.directory / "network.sqlite")

    def tearDown(self):
        self.builder.db.close()
        self.temp.cleanup()

    def edges(self):
        self.builder.compress()
        return [json.loads(row[0]) for row in self.builder.db.execute("SELECT value FROM edges ORDER BY id")]

    def test_bends_junctions_and_grade_separated_crossings(self):
        a, b, c, d, e = (point(1), point(2, 620001000, 250001000), point(3, 620002000, 250000000),
                          point(4, 620003000, 250001000), point(5, 620001000, 250002000))
        self.builder.add_way(100, {"highway": "path"}, [a, b, c, d])
        self.builder.add_way(101, {"highway": "path"}, [c, e])
        # Same coordinate, different OSM IDs: a bridge/grade crossing must not join.
        f, g = point(30, c[1], c[2]), point(31, d[1], d[2])
        self.builder.add_way(102, {"highway": "path", "bridge": "yes"}, [f, g])
        edges = self.edges()
        self.assertEqual(len(edges), 4)
        self.assertEqual(edges[0]["points"], [a, b, c])
        self.assertEqual(edges[1]["points"], [c, d])
        self.assertEqual(edges[-1]["points"], [f, g])
        self.assertGreater(edges[0]["meters"], meters(a, c) + 1)  # actual bend, not endpoint chord
        self.assertEqual(set(p[0] for e in edges for p in (e["points"][0], e["points"][-1])), {1, 3, 4, 5, 30, 31})

    def test_gaps_restrictions_and_barriers_cannot_be_bridged(self):
        a, b, c = point(1), point(2, 620001000), point(3, 620002000)
        tags = {"highway": "residential", "access": "yes"}
        self.builder.add_way(1, tags, [a, None, c])
        self.builder.add_way(2, tags, [a, b, c], restricted=True)
        self.builder.add_way(3, tags, [a, b, c], {2: FOOT})
        self.builder.add_way(4, tags, [a, b, c], {2: BICYCLE})
        self.builder.add_way(5, tags, [a, b, c], {2: 3})
        self.builder.add_way(6, tags, [a, point(99, 650000000)])
        self.builder.add_way(7, tags, [a, a, c])
        edges = self.edges()
        self.assertEqual({(e["way"], e["f"], e["b"]) for e in edges}, {(3, 2, 2), (4, 1, 1)})
        self.assertEqual(self.builder.stats["missingGeometryWays"], 1)
        self.assertEqual(self.builder.stats["invalidGeometryWays"], 2)

    def test_loops_repeated_nodes_and_cell_seams_preserve_topology(self):
        a, b, c = point(1, 620499000), point(2, 620501000), point(3, 620502000, 250001000)
        self.builder.add_way(1, {"highway": "path"}, [a, b, c, a])
        edges = self.edges()
        self.assertGreaterEqual(len(edges), 2)
        self.assertEqual(edges[0]["points"][0], a)
        self.assertEqual(edges[-1]["points"][-1], a)
        pairs = [(p, q) for edge in edges for p, q in zip(edge["points"], edge["points"][1:])]
        self.assertEqual(pairs, [(a, b), (b, c), (c, a)])
        self.assertIn(cell(a), edge_cells([a, b]))
        self.assertIn(cell(b), edge_cells([a, b]))

    def test_chunk_export_is_checksummed_and_keeps_original_geometry(self):
        points = [point(1, 620499000), point(2, 620501000), point(3, 620502000, 250001000)]
        self.builder.add_way(9, {"highway": "path", "name": "Äänekoski & path", "surface": "gravel"}, points)
        edges = self.edges()
        source = {"md5": "synthetic", "timestamp": "2026-10-30T21:24:51Z"}
        first = self.builder.export(self.directory / "a", source)
        second = self.builder.export(self.directory / "b", source)
        self.assertEqual(first, second)
        self.assertEqual(first["license"], "ODbL-1.0")
        exported = {}
        for key, info in first["chunks"].items():
            raw = (self.directory / "a" / (key + ".json.gz")).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), info["sha256"])
            decoded = gzip.decompress(raw)
            self.assertEqual(len(decoded), info["decodedBytes"])
            for edge in json.loads(decoded)["edges"]:
                exported[edge["id"]] = edge
        self.assertEqual(list(exported.values()), edges)
        audit = AUDIT.inspect(self.directory / "a", self.directory / "network.sqlite")
        self.assertEqual(audit["originalWaysChecked"], 1)
        self.assertEqual(audit["edges"], len(edges))
        with self.assertRaises(FileExistsError):
            self.builder.export(self.directory / "a", source)
        with self.assertRaises(FileExistsError):
            NetworkBuilder(self.directory / "network.sqlite")

    def test_audit_detects_corruption_omission_and_rehashed_geometry_changes(self):
        self.builder.add_way(1, {"highway": "path"}, [point(1), point(2, 620001000), point(3, 620002000)])
        self.edges()
        out = self.directory / "audit"
        manifest = self.builder.export(out, {"md5": "synthetic"})
        key = next(iter(manifest["chunks"]))
        path = out / (key + ".json.gz")
        raw = path.read_bytes()
        path.write_bytes(b"corrupt")
        with self.assertRaisesRegex(ValueError, "size"):
            AUDIT.inspect(out)
        path.write_bytes(raw[:-1] + bytes([raw[-1] ^ 1]))
        with self.assertRaisesRegex(ValueError, "checksum"):
            AUDIT.inspect(out)
        chunk = json.loads(gzip.decompress(raw))
        chunk["edges"][0]["points"][1][1] += 1
        decoded = json.dumps(chunk, separators=(",", ":")).encode()
        changed = gzip.compress(decoded, mtime=0)
        path.write_bytes(changed)
        manifest["chunks"][key].update(bytes=len(changed), decodedBytes=len(decoded),
                                       sha256=hashlib.sha256(changed).hexdigest())
        (out / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "differs"):
            AUDIT.inspect(out, self.directory / "network.sqlite")
        manifest["chunks"] = {}
        (out / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "coverage"):
            AUDIT.inspect(out)


class OsmiumIntegrationTests(unittest.TestCase):
    def test_real_xml_reader_keeps_barriers_restrictions_and_missing_nodes(self):
        if importlib.util.find_spec("osmium") is None and not (ROOT / ".tools/osm-python/osmium").exists():
            self.skipTest("Native integration needs osmium==4.3.2; pure graph/access tests still run")
        with tempfile.TemporaryDirectory(dir=TEMP) as folder:
            directory = Path(folder)
            source = directory / "fixture.osm"
            source.write_text('''<osm version="0.6" generator="synthetic-test">
              <node id="1" lat="62" lon="25"/><node id="2" lat="62.001" lon="25"/>
              <node id="3" lat="62.002" lon="25"><tag k="barrier" v="gate"/></node>
              <node id="4" lat="62.003" lon="25"/><node id="5" lat="62.004" lon="25"/>
              <way id="1"><nd ref="1"/><nd ref="2"/><tag k="highway" v="path"/></way>
              <way id="2"><nd ref="2"/><nd ref="3"/><tag k="highway" v="path"/></way>
              <way id="3"><nd ref="2"/><nd ref="4"/><tag k="highway" v="path"/></way>
              <way id="4"><nd ref="4"/><nd ref="5"/><tag k="highway" v="path"/></way>
              <way id="5"><nd ref="1"/><nd ref="999"/><nd ref="5"/><tag k="highway" v="path"/></way>
              <relation id="1"><member type="way" ref="3" role="from"/>
              <member type="node" ref="4" role="via"/><member type="way" ref="4" role="to"/>
              <tag k="type" v="restriction"/><tag k="restriction" v="no_right_turn"/></relation>
              </osm>''', encoding="utf-8")
            args = [sys.executable, str(ROOT / "tools/Build-RouteNetwork.py"), "--source", str(source),
                    "--output", str(directory / "out"), "--expected-md5", hashlib.md5(source.read_bytes()).hexdigest()]
            run = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
            manifest = json.loads((directory / "out/manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["counts"]["acceptedWays"], 1)
            self.assertEqual(manifest["counts"]["restrictionWaysExcluded"], 2)
            self.assertEqual(manifest["counts"]["missingGeometryWays"], 1)
            self.assertEqual(manifest["counts"]["nodeBlockedWays"], 1)
            repeat = subprocess.run(args, capture_output=True, text=True)
            self.assertNotEqual(repeat.returncode, 0)
            args[-3] = str(directory / "bad")
            args[-1] = "0" * 32
            bad = subprocess.run(args, capture_output=True, text=True)
            self.assertNotEqual(bad.returncode, 0)
            self.assertFalse((directory / "bad.sqlite").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
