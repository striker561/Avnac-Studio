# MCP performance harness

Times the live MCP surface over HTTP and **fails the run** when any operation's
p95 exceeds its budget in [`budgets.json`](budgets.json). The same table is
mirrored in `frontend/src/lib/mcp/budgets.ts`, where the app logs a warning when
a call overshoots; a unit test keeps the two copies identical.

## Run it

1. Start Avnac Studio and enable the MCP server (Settings → MCP server).
2. Copy the bearer token into `%TEMP%\avnac-token.txt` (or pass `--token-file`).
3. Run:

```powershell
python scripts/mcp-perf/run_perf.py --url http://127.0.0.1:12345/ --out perf.json
```

The script opens its own MCP session (no `--session` needed) and creates a
scratch canvas named `PERF TEST`. It leaves that canvas in the file list.

Exit code is `0` only when every budgeted operation passes. The JSON report has
p50/p95, per-sample timings, the action each scenario maps to, and the failed
list.

## What it measures

| Scenario | MCP action budget |
|---|---|
| Render 30 shapes/text in one batch | `render_elements` |
| Render 5 with `includePreview` | `render_elements` |
| Measure 20 text specs | `measure_elements` |
| Modify 10 objects | `modify_elements` |
| Select 6 / align 6 | `select_objects` / `align_objects` |
| Canvas summary / object properties | `get_canvas_summary` / `get_object_properties` |
| Screenshot / PNG export | `get_canvas_image` / `export_png` |
| Files list | `list_files` |
| Place a photo with `fit: cover` (network) | `render_elements` |

Budgets are warm-app p95 targets, deliberately below the Go bridge timeouts
(5 s default, 20 s for renders) so a regression fails the harness long before a
call is killed. Cold paths are bounded by the code itself: 1.5 s font wait cap,
2.5 s image-size fetch timeout.

## Changing a budget

Edit both `budgets.json` and `MCP_OPERATION_BUDGETS_MS`; `budgets.test.ts` fails
if they differ or if a budget exceeds the bridge ceiling.
