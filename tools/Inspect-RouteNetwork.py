"""Read-only full graph audit. Verify chunks and optional source-way preservation."""
import argparse
import gzip
import hashlib
import json
import re
import sqlite3
from functools import lru_cache
from pathlib import Path


def inspect(network, database=None):
    db = sqlite3.connect(database.resolve().as_uri() + "?mode=ro", uri=True) if database else None
    try:
        return _inspect(network, db)
    finally:
        if db:
            db.close()


def _inspect(network, db):
    manifest = json.loads((network / "manifest.json").read_text(encoding="utf-8"))
    if manifest["version"] != 1 or manifest["policy"] != "finland-paths-dev-1":
        raise ValueError("Unsupported network policy/version")

    @lru_cache(maxsize=8192)
    def stored_edge(key):
        row = db.execute("SELECT value FROM edges WHERE id=?", (key,)).fetchone()
        if row is None:
            raise ValueError("Chunk contains an edge absent from the source database")
        return json.loads(row[0])

    seen, total_bytes, max_decoded = set(), 0, 0
    for key, info in manifest["chunks"].items():
        if not re.fullmatch(r"-?\d+_-?\d+", key):
            raise ValueError("Invalid chunk path")
        path = network / (key + ".json.gz")
        if path.stat().st_size != info["bytes"] or info["bytes"] > 16 * 1024 * 1024:
            raise ValueError("Invalid compressed size")
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != info["sha256"]:
            raise ValueError("Chunk checksum mismatch")
        with gzip.open(path, "rb") as stream:
            decoded = stream.read(16 * 1024 * 1024 + 1)
        if len(decoded) > 16 * 1024 * 1024 or len(decoded) != info["decodedBytes"]:
            raise ValueError("Chunk exceeds decoded bound")
        chunk = json.loads(decoded)
        if (chunk["version"] != 1 or chunk["policy"] != manifest["policy"] or
                chunk["cell"] != key or len(chunk["edges"]) != info["edges"]):
            raise ValueError("Chunk identity/count mismatch")
        local = set()
        for edge in chunk["edges"]:
            if edge["id"] in local:
                raise ValueError("Duplicate edge within chunk")
            local.add(edge["id"])
            if db and edge != stored_edge(edge["id"]):
                raise ValueError("Chunk edge differs from compressed source")
            seen.add(edge["id"])
        total_bytes += len(raw)
        max_decoded = max(max_decoded, len(decoded))
    if len(seen) != manifest["counts"]["edges"]:
        raise ValueError("Incomplete exported edge coverage")
    ways_checked = 0
    if db:
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("Source database integrity failure")
        if db.execute("SELECT count(*) FROM edges").fetchone()[0] != len(seen):
            raise ValueError("Export omits source edges")
        # Every chain must reconstruct exactly the original ordered OSM geometry.
        # Never trust a matching count or endpoints alone: bends/gaps matter.
        for way, fwd, back, tags, points in db.execute("SELECT * FROM ways ORDER BY id"):
            rows = [json.loads(row[0]) for row in db.execute(
                "SELECT value FROM edges WHERE id>=? AND id<?", (f"{way}:", f"{way};"))]
            rows.sort(key=lambda edge: int(edge["id"].split(":")[1]))
            reconstructed = []
            for index, edge in enumerate(rows):
                if (edge["id"] != f"{way}:{index}" or edge["f"] != fwd or edge["b"] != back
                        or edge["tags"] != json.loads(tags)):
                    raise ValueError("Source access or segment sequence changed")
                if reconstructed and reconstructed[-1] != edge["points"][0]:
                    raise ValueError("Compressed chain has a gap")
                reconstructed.extend(edge["points"] if index == 0 else edge["points"][1:])
            if reconstructed != json.loads(points):
                raise ValueError("Mapped geometry changed during compression")
            ways_checked += 1
    return {"policy": manifest["policy"], "source": manifest["source"],
            "chunks": len(manifest["chunks"]), "edges": len(seen), "originalWaysChecked": ways_checked,
            "compressedBytes": total_bytes, "maxDecodedChunkBytes": max_decoded}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("network", type=Path)
    parser.add_argument("--database", type=Path)
    args = parser.parse_args()
    print(json.dumps(inspect(args.network, args.database), indent=2))
