/**
 * Every `mcp:action` this build can dispatch.
 *
 * Reported by `client_status`, and compared in Settings with the Go tool
 * registry. Two builds of the frontend can be attached to one app at the same
 * time (a second window, or the app open in a browser tab), and the older one
 * answers `Unknown action '…'` for anything added since it loaded. Keeping the
 * list here, small and dependency-free, lets the app-shell responder report it
 * even when no design is open.
 *
 * Keep this in step with the switch in `handleMCPAction`; the Go test
 * `TestFrontendActionListMatchesServer` fails when the two drift apart.
 */
export const MCP_IMPLEMENTED_ACTIONS: string[] = [
  "add_page",
  "align_objects",
  "apply_artboard_preset",
  "clear_canvas",
  "client_status",
  "create_canvas",
  "create_snapshot",
  "delete_object",
  "delete_page",
  "distribute_objects",
  "export_object",
  "export_png",
  "export_svg",
  "fit_to_artboard",
  "get_canvas_image",
  "get_canvas_state",
  "get_canvas_summary",
  "get_font_list",
  "get_object_properties",
  "get_selection",
  "goto_page",
  "group_objects",
  "list_objects",
  "measure_elements",
  "modify_elements",
  "open_workspace",
  "redo",
  "rename_page",
  "rename_workspace",
  "render_elements",
  "resize_artboard",
  "restore_snapshot",
  "select_objects",
  "set_background",
  "undo",
  "ungroup_objects",
  "validate_canvas",
  "vector_delete",
  "vector_draw",
  "vector_update",
];

export const MCP_IMPLEMENTED_ACTION_SET: ReadonlySet<string> = new Set(
  MCP_IMPLEMENTED_ACTIONS,
);
