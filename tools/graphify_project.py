"""Build and check Trail Relics' local, code-only Graphify knowledge graph."""
import argparse
import json
from collections import Counter
from importlib.metadata import version
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "graphify-out"
UPSTREAM = "a0946f962af31b19bff941b453f6dae9a7077c7a"
FORBIDDEN = {".tools", ".keys", ".git", ".codex", "node_modules", "dist", "build", "test-results", "graphify-out"}


def graphify(*args):
    subprocess.run([sys.executable, "-m", "graphify", *args], cwd=ROOT, check=True)


def validate():
    graph = json.loads((OUT / "graph.json").read_text(encoding="utf-8"))
    nodes = graph["nodes"]
    edges = graph.get("links", graph.get("edges", []))
    if not nodes or not edges:
        raise ValueError("Graph must contain both nodes and relationships")
    ids = {n["id"] for n in nodes}
    if len(ids) != len(nodes):
        raise ValueError("Duplicate graph node IDs")
    for edge in edges:
        if edge["source"] not in ids or edge["target"] not in ids:
            raise ValueError("Relationship refers to a missing node")
    files = set()
    for node in nodes:
        source = node.get("source_file")
        if not source:
            continue  # External/unresolved symbols need not have a source file.
        path = Path(source.replace("\\", "/"))
        if path.is_absolute():
            path = path.relative_to(ROOT)
        if ".." in path.parts or FORBIDDEN.intersection(path.parts) or path.name.startswith(".env"):
            raise ValueError(f"Excluded source leaked into graph: {path}")
        if not (ROOT / path).is_file():
            raise ValueError(f"Source no longer exists: {path}")
        files.add(path.as_posix())
    for required in ("mobile/src/location/tracker.ts", "mobile/src/game/engine.ts", "mobile/src/accounts/local-accounts.ts"):
        if required not in files:
            raise ValueError(f"Core subsystem absent: {required}")
    for output in ("graph.html", "GRAPH_REPORT.md"):
        if not (OUT / output).is_file():
            raise ValueError(f"Missing output: {output}")
    metadata = {
        "graphifyVersion": version("graphifyy"), "upstreamCommit": UPSTREAM,
        "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "workingTreeDirty": bool(subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip()),
        "mode": "local-code-only", "nodes": len(nodes), "edges": len(edges),
        "indexedSourceFiles": len(files),
        "confidence": dict(Counter(e.get("confidence", "UNSPECIFIED") for e in edges)),
        "limits": "No semantic document/media indexing; Monkey C unsupported. Relationships do not prove correctness or completed backlog items.",
    }
    (OUT / "release.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    (OUT / "CHECKS.md").write_text(
        "# Knowledge graph checks\n\n"
        f"Passed: {len(nodes)} nodes, {len(edges)} relationships, {len(files)} indexed source files.\n\n"
        "Checked nonempty graph, unique IDs, endpoint integrity, core subsystem coverage, existing source paths, excluded paths and required outputs.\n\n"
        "This is structural analysis, not a gameplay test or phone field test. See release.json for source provenance and scope.\n",
        encoding="utf-8",
    )
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    if version("graphifyy") != "0.9.99":
        raise SystemExit("Install tools/graphify-requirements.txt before building")
    if not args.check_only:
        graphify("extract", ".", "--code-only", "--no-dedup", "--max-workers", "2")
        graphify("cluster-only", ".", "--no-label")
    validate()
