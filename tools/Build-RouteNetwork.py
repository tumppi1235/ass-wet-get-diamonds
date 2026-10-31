"""Build a fresh offline national route graph from a checksum-verified OSM PBF.

Use Python 3.12 with osmium==4.3.2; local .tools/osm-python is also supported.
All intermediates/output must be new paths. This never downloads map/player data.
"""
import argparse
import hashlib
import importlib.metadata
import sys
from pathlib import Path

from route_network import ACCESS_KEYS, NetworkBuilder, node_blocked_modes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--expected-md5", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    source, output = args.source.resolve(strict=True), args.output.resolve()
    database = output.with_suffix(".sqlite")
    cache = output.with_suffix(".node-cache")
    if output.exists() or database.exists() or cache.exists() or source in {database, cache}:
        parser.error("Output directory, intermediate database and node cache must be new paths")
    digest = hashlib.md5()  # input identity, not a security/authentication primitive
    with source.open("rb") as stream:
        for block in iter(lambda: stream.read(4 * 1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != args.expected_md5.lower():
        parser.error("Source checksum mismatch; no output created")
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / ".tools/osm-python"))
    import osmium
    if importlib.metadata.version("osmium") != "4.3.2":
        parser.error("Use the reproducible osmium==4.3.2 reader")

    with osmium.io.Reader(str(source), osmium.osm.NOTHING) as reader:
        header = reader.header()
        provenance = {"url": "https://download.geofabrik.de/europe/finland.html",
                      "md5": digest.hexdigest(), "bytes": source.stat().st_size,
                      "timestamp": header.get("osmosis_replication_timestamp"),
                      "sequence": header.get("osmosis_replication_sequence_number"),
                      "generator": header.get("generator"), "extractor": "pyosmium-4.3.2"}
    blocked = {}
    # Native filters avoid sending all untagged location nodes through Python.
    keys = ACCESS_KEYS | {f"{k}:conditional" for k in ("access", "foot", "bicycle", "vehicle")}
    for node in osmium.FileProcessor(str(source), osmium.osm.NODE).with_filter(osmium.filter.KeyFilter(*sorted(keys))):
        mask = node_blocked_modes(dict(node.tags))
        if mask:
            blocked[node.id] = mask
    restrictions = set()
    for relation in osmium.FileProcessor(str(source), osmium.osm.RELATION).with_filter(osmium.filter.KeyFilter("type")):
        if relation.tags.get("type") == "restriction":
            restrictions.update(member.ref for member in relation.members if member.type == "w")
    print(f"Read {len(blocked)} restricted nodes and {len(restrictions)} restriction-member ways", flush=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    builder = NetworkBuilder(database)

    class Ways(osmium.SimpleHandler):
        def way(self, way):
            if "highway" not in way.tags:
                return
            # A missing coordinate is retained as a gap sentinel, never filtered out.
            points = [[n.ref, round(n.lat * 1e7), round(n.lon * 1e7)] if n.location.valid() else None for n in way.nodes]
            builder.add_way(way.id, dict(way.tags), points, blocked, way.id in restrictions)
            if builder.stats["seenWays"] % 100000 == 0:
                print(dict(builder.stats), flush=True)

    Ways().apply_file(str(source), locations=True, idx="sparse_file_array," + str(cache))
    print("Compressing mapped degree-two chains", dict(builder.stats), flush=True)
    builder.compress()
    manifest = builder.export(output, provenance)
    builder.db.close()
    print({"counts": manifest["counts"], "chunks": len(manifest["chunks"]),
           "compressedBytes": sum(c["bytes"] for c in manifest["chunks"].values()),
           "largestChunk": max((c["decodedBytes"] for c in manifest["chunks"].values()), default=0)}, flush=True)


if __name__ == "__main__":
    main()
