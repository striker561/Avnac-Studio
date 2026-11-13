/**
 * Hard latency budgets for MCP actions, mirrored in scripts/mcp-perf/budgets.json.
 *
 * The JSON file is what the performance harness enforces (p95 > budget fails
 * the run); this map is used at runtime only to warn when a call overshoots,
 * and a unit test keeps the two copies identical.
 *
 * Budgets are p95 wall-clock targets on a warm app, measured over the MCP HTTP
 * surface. They sit below the Go bridge timeouts (5s default, 20s for renders)
 * so a budget breach is visible long before a call is killed.
 */

export const MCP_BRIDGE_TIMEOUT_MS = 5000;

export const MCP_OPERATION_BUDGETS_MS: Record<string, number> = {
  create_canvas: 600,
  add_page: 1000,
  goto_page: 1000,
  rename_page: 500,
  delete_page: 1000,
  apply_artboard_preset: 600,
  set_background: 400,
  clear_canvas: 500,
  render_elements: 2000,
  modify_elements: 700,
  delete_object: 400,
  measure_elements: 400,
  get_canvas_summary: 600,
  get_canvas_state: 400,
  list_objects: 300,
  get_object_properties: 2500,
  get_canvas_image: 2500,
  export_png: 3000,
  export_object: 3000,
  list_files: 500,
  open_canvas: 4000,
  rename_file: 500,
  search_unsplash: 4000,
  get_font_list: 300,
  list_stickers: 300,
  align_objects: 400,
  distribute_objects: 400,
  group_objects: 500,
  ungroup_objects: 500,
  fit_to_artboard: 500,
  select_objects: 250,
  get_selection: 250,
};

export function budgetFor(action: string): number | undefined {
  return MCP_OPERATION_BUDGETS_MS[action];
}

export function isOverBudget(action: string, elapsedMs: number): boolean {
  const budget = budgetFor(action);
  return budget !== undefined && elapsedMs > budget;
}
