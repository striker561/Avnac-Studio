"""MCP performance harness for Avnac Studio.

Drives the live MCP server over HTTP, times each operation, and fails (exit 1)
when any p95 exceeds the hard budget. Results are written as JSON so a before/
after comparison is possible.

Usage:
  python run_perf.py --url http://127.0.0.1:12345/ --session <id> --out baseline.json

Budgets live in budgets.json next to this script; they are the same table the
app uses for overshoot warnings (frontend/src/lib/mcp/budgets.ts).
"""

from __future__ import annotations

import argparse
import atexit
import json
import os
import statistics
import sys
import time
import urllib.request

# Measured scenario -> MCP action whose budget applies.
BUDGET_ACTIONS = {
    "canvas.add_page": "add_page",
    "canvas.goto_page": "goto_page",
    "canvas.rename_page": "rename_page",
    "canvas.delete_page": "delete_page",
    "elements.render30": "render_elements",
    "elements.render_preview5": "render_elements",
    "elements.measure20": "measure_elements",
    "elements.modify10": "modify_elements",
    "arrange.select6": "select_objects",
    "arrange.align6": "align_objects",
    "get_canvas_summary": "get_canvas_summary",
    "get_object_properties": "get_object_properties",
    "get_canvas_image": "get_canvas_image",
    "export.png": "export_png",
    "files.list": "list_files",
    "elements.render_image_cover": "render_elements",
}

TOKEN = os.path.join(os.environ.get("TEMP", "/tmp"), "avnac-token.txt")


def read_token() -> str:
    """Read the bearer token, tolerating a UTF-8 BOM (Windows editors add one)."""
    with open(TOKEN, encoding="utf-8-sig") as handle:
        return handle.read().strip()


def init_session(url: str) -> str:
    """Open a fresh MCP session and return its id."""
    body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 0,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {"name": "avnac-perf", "version": "1.0"},
            },
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {read_token()}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        session = response.headers.get("Mcp-Session-Id")
        response.read()
    if not session:
        raise RuntimeError("server did not return Mcp-Session-Id")
    return session
UNSPLASH_URL = (
    "https://images.unsplash.com/photo-1610632380989-680fe40816c6"
    "?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
)

_id = 0


def rpc(url: str, session: str, method: str, params: dict | None = None):
    global _id
    _id += 1
    body = json.dumps(
        {"jsonrpc": "2.0", "id": _id, "method": method, "params": params}
    ).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {read_token()}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "Mcp-Session-Id": session,
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        raw = response.read().decode("utf-8")
    for line in raw.splitlines():
        if line.startswith("data: "):
            raw = line[6:]
            break
    message = json.loads(raw)
    if "error" in message:
        raise RuntimeError(f"{method}: {message['error']}")
    return message["result"]


def tool(url: str, session: str, name: str, arguments: dict):
    result = rpc(url, session, "tools/call", {"name": name, "arguments": arguments})
    if result.get("isError"):
        raise RuntimeError(f"{name}: {result['content'][0]['text']}")
    return result.get("structuredContent") or {}


def timed(fn, repeats: int):
    fn()  # warm-up
    samples = []
    for _ in range(repeats):
        started = time.perf_counter()
        fn()
        samples.append((time.perf_counter() - started) * 1000)
    return samples


def pct(samples: list[float], p: float) -> float:
    ordered = sorted(samples)
    index = min(len(ordered) - 1, max(0, round((p / 100) * (len(ordered) - 1))))
    return ordered[index]


def render_batch(count: int) -> list[dict]:
    elements = []
    for i in range(count):
        column, row = i % 5, i // 5
        left, top = 60 + column * 300, 80 + row * 180
        kind = i % 3
        if kind == 0:
            elements.append(
                {
                    "type": "rect",
                    "left": left,
                    "top": top,
                    "width": 220,
                    "height": 90,
                    "fill": "#1E3A2E",
                    "cornerRadius": 12,
                }
            )
        elif kind == 1:
            elements.append(
                {
                    "type": "ellipse",
                    "left": left,
                    "top": top,
                    "width": 120,
                    "height": 120,
                    "fill": "#C9DF8A",
                }
            )
        else:
            elements.append(
                {
                    "type": "text",
                    "text": f"Perf sample {i}",
                    "left": left,
                    "top": top,
                    "fontSize": 24,
                    "fontFamily": "Poppins" if i % 2 else "Inter",
                    "fill": "#FFFFFF",
                }
            )
    return elements


def timed_with_setup(setup, fn, repeats: int):
    setup()
    fn()  # warm-up
    samples = []
    for _ in range(repeats):
        setup()
        started = time.perf_counter()
        fn()
        samples.append((time.perf_counter() - started) * 1000)
    return samples


def main() -> int:
    global TOKEN
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--session", default="")
    parser.add_argument("--token-file", default=TOKEN)
    parser.add_argument("--out", default="perf.json")
    parser.add_argument("--repeats", type=int, default=5)
    args = parser.parse_args()

    TOKEN = args.token_file

    url = args.url
    session = args.session or init_session(url)
    budget_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "budgets.json")
    with open(budget_path, encoding="utf-8") as handle:
        budgets = json.load(handle)
    results: dict[str, dict] = {}

    def record(name: str, samples: list[float]):
        action = BUDGET_ACTIONS.get(name)
        budget = budgets.get(action) if action else None
        p95 = pct(samples, 95)
        results[name] = {
            "action": action,
            "samples_ms": [round(v, 1) for v in samples],
            "p50_ms": round(statistics.median(samples), 1),
            "p95_ms": round(p95, 1),
            "budget_ms": budget,
            "passed": budget is None or p95 <= budget,
        }

    # This harness used to create a separate "PERF TEST" canvas. That is exactly
    # the project-sprawl the page feature exists to prevent, so it now measures
    # inside the open document and cleans its scratch page up on exit.
    summary = tool(url, session, "get_canvas_summary", {})
    if not summary.get("pages"):
        raise RuntimeError(
            "No open canvas. Open a project (or create one) before running the "
            "perf harness; it measures pages inside the active document."
        )

    scratch = tool(url, session, "canvas", {
        "op": "add-page", "name": "PERF TEST — page"})
    scratch_page = scratch.get("page") or {}
    scratch_index = scratch_page.get("index")
    if scratch_index is None:
        raise RuntimeError("add-page returned no page index")
    scratch_number = scratch_page.get("number", scratch_index + 1)

    def cleanup_perf_pages():
        try:
            pages = tool(url, session, "get_canvas_summary", {}).get("pages", [])
        except Exception:
            return
        removable = [p for p in pages
                     if str(p.get("name", "")).startswith("PERF TEST")]
        for page in sorted(removable, key=lambda p: p.get("number", 0), reverse=True):
            try:
                tool(url, session, "canvas", {
                    "op": "delete-page", "page": page["number"]})
            except Exception:
                pass

    atexit.register(cleanup_perf_pages)

    clear = lambda: tool(url, session, "canvas", {"op": "clear"})
    clear()

    # --- page operations, measured on the scratch page ---------------------
    page_add_samples = []
    for i in range(args.repeats):
        started = time.perf_counter()
        tool(url, session, "canvas", {
            "op": "add-page", "name": f"PERF TEST — add {i}"})
        page_add_samples.append((time.perf_counter() - started) * 1000)
    record("canvas.add_page", page_add_samples)

    record("canvas.goto_page", timed_with_setup(
        lambda: tool(url, session, "canvas", {
            "op": "go-page", "index": scratch_index}),
        lambda: tool(url, session, "canvas", {"op": "go-page", "index": 0}),
        args.repeats))
    tool(url, session, "canvas", {"op": "go-page", "index": scratch_index})

    page_rename_samples = []
    for i in range(args.repeats):
        started = time.perf_counter()
        tool(url, session, "canvas", {
            "op": "rename-page", "page": scratch_number,
            "name": f"PERF TEST — rename {i}"})
        page_rename_samples.append((time.perf_counter() - started) * 1000)
    record("canvas.rename_page", page_rename_samples)

    def add_temp_page():
        tool(url, session, "canvas", {
            "op": "add-page", "name": "PERF TEST — delete"})

    record("canvas.delete_page", timed_with_setup(
        add_temp_page,
        lambda: tool(url, session, "canvas", {
            "op": "delete-page", "page": "PERF TEST — delete"}),
        args.repeats))

    record("elements.render30", timed_with_setup(
        clear,
        lambda: tool(url, session, "elements", {"op": "render", "elements": render_batch(30)}),
        args.repeats))
    clear_samples = timed(clear, args.repeats)
    results["canvas.clear"] = {
        "p50_ms": round(statistics.median(clear_samples), 1),
        "p95_ms": round(pct(clear_samples, 95), 1),
    }

    clear()
    tool(url, session, "elements", {"op": "render", "elements": render_batch(20)})
    record("elements.render_preview5", timed_with_setup(
        clear,
        lambda: tool(url, session, "elements", {
            "op": "render", "elements": render_batch(5), "includePreview": True}),
        args.repeats))
    clear()
    tool(url, session, "elements", {"op": "render", "elements": render_batch(20)})
    record("elements.measure20", timed(
        lambda: tool(url, session, "elements", {
            "op": "measure", "elements": [
                {"type": "text", "text": f"Measure {i}", "fontSize": 24,
                 "fontFamily": "Inter"} for i in range(20)]}),
        args.repeats))
    record("get_canvas_summary", timed(
        lambda: tool(url, session, "get_canvas_summary", {}), args.repeats))

    objects = tool(url, session, "list_objects", {})
    text_id = next(o["id"] for o in objects.get("objects", []) if o.get("type") == "text")
    record("get_object_properties", timed(
        lambda: tool(url, session, "get_object_properties", {"objectId": text_id}),
        args.repeats))
    record("get_canvas_image", timed(
        lambda: tool(url, session, "get_canvas_image", {}), max(3, args.repeats - 2)))
    record("export.png", timed(
        lambda: tool(url, session, "export", {"op": "png", "multiplier": 1}),
        max(3, args.repeats - 2)))
    record("files.list", timed(
        lambda: tool(url, session, "files", {"op": "list"}), args.repeats))

    ids = [o["id"] for o in objects.get("objects", [])][:10]
    record("elements.modify10", timed(
        lambda: tool(url, session, "elements", {
            "op": "modify",
            "modifications": [{"objectId": i, "opacity": 0.9} for i in ids]}),
        args.repeats))
    select_ids = [o["id"] for o in objects.get("objects", [])][:6]
    record("arrange.select6", timed(
        lambda: tool(url, session, "arrange", {"op": "select", "objectIds": select_ids}),
        args.repeats))
    record("arrange.align6", timed(
        lambda: tool(url, session, "arrange", {"op": "align", "type": "left"}),
        args.repeats))

    # Network-bound image placement, measured separately.
    record("elements.render_image_cover", timed(
        lambda: tool(url, session, "elements", {
            "op": "render",
            "elements": [{"type": "image", "url": UNSPLASH_URL, "left": 1200,
                          "top": 800, "width": 300, "height": 300, "fit": "cover"}]}),
        2))

    # --- correctness gates: speed must not break the output -----------------
    checks: list[dict] = []

    def check(name: str, ok: bool, detail: object = ""):
        checks.append({"check": name, "passed": bool(ok), "detail": str(detail)})

    clear()
    rendered = tool(url, session, "elements", {
        "op": "render", "elements": render_batch(30)})
    check("render 30 creates 30 nodes", len(rendered.get("created", [])) == 30,
          len(rendered.get("created", [])))

    summary = tool(url, session, "get_canvas_summary", {})
    check("summary sees 30 nodes", len(summary.get("nodes", [])) == 30,
          len(summary.get("nodes", [])))

    measured = tool(url, session, "elements", {
        "op": "measure",
        "elements": [{"type": "text", "text": f"M{i}", "fontSize": 24}
                      for i in range(20)]})
    layouts = measured.get("elements", [])
    check("measure returns 20 layouts", len(layouts) == 20, len(layouts))
    check("measure widths are positive", all(e.get("width", 0) > 0 for e in layouts))

    clear()
    placed = tool(url, session, "elements", {
        "op": "render",
        "elements": [{"type": "image", "url": UNSPLASH_URL, "left": 100,
                      "top": 100, "width": 300, "height": 300, "fit": "cover"}]})
    image_id = placed["created"][0]["id"]
    image_node = tool(url, session, "get_object_properties",
                      {"objectId": image_id})["node"]
    crop_w = image_node.get("cropWidth") or 0
    crop_h = image_node.get("cropHeight") or 0
    check("cover crop is applied", crop_w > 0 and crop_h > 0,
          f"{crop_w}x{crop_h}")
    check("cover crop matches the square box",
          crop_h > 0 and abs(crop_w / crop_h - 1) < 0.02,
          f"ratio={crop_w / max(1, crop_h):.3f}")

    exported = tool(url, session, "export", {"op": "png", "multiplier": 1})
    check("export keeps the artboard size",
          exported.get("width") == 1600 and exported.get("height") == 1200,
          f"{exported.get('width')}x{exported.get('height')}")

    screenshot = rpc(url, session, "tools/call", {
        "name": "get_canvas_image", "arguments": {}})
    content = screenshot.get("content", [])
    check("screenshot returns an image",
          any(part.get("type") == "image" for part in content),
          [part.get("type") for part in content])

    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "url": url,
        "budgets": budgets,
        "results": results,
        "failed": [name for name, data in results.items()
                   if data.get("budget_ms") is not None and not data.get("passed", True)],
        "correctness": {
            "checks": checks,
            "passed": all(entry["passed"] for entry in checks),
        },
    }
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print(f"{'operation':32} {'p50':>8} {'p95':>8} {'budget':>8}  result")
    for name, data in results.items():
        budget = data.get("budget_ms")
        if budget is None:
            print(f"{name:32} {data.get('p50_ms', 0):8.1f} {data.get('p95_ms', 0):8.1f} {'-':>8}")
            continue
        mark = "PASS" if data["passed"] else "FAIL"
        print(f"{name:32} {data['p50_ms']:8.1f} {data['p95_ms']:8.1f} {budget:8}  {mark}")
    print("\nCorrectness:")
    for entry in checks:
        mark = "PASS" if entry["passed"] else "FAIL"
        print(f"  {mark}  {entry['check']}" + (f"  ({entry['detail']})" if entry["detail"] else ""))

    if report["failed"]:
        print(f"\nFAILED (budget): {', '.join(report['failed'])}")
        return 1
    if not report["correctness"]["passed"]:
        bad = [entry["check"] for entry in checks if not entry["passed"]]
        print(f"\nFAILED (correctness): {', '.join(bad)}")
        return 1
    print("\nAll operations within budget and outputs correct.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
