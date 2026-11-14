import { describe, expect, it } from "vitest";
import { buildShellStatusPayload } from "@/lib/mcp/shell-status-responder";
import { MCP_IMPLEMENTED_ACTIONS } from "@/lib/mcp/actions";

describe("buildShellStatusPayload", () => {
  it("reports the shell's action list so Settings can compare it", () => {
    const payload = buildShellStatusPayload();
    expect(payload.source).toBe("app-shell");
    expect(payload.actionHandlerId).toBe("app-shell");
    expect(typeof payload.clientId).toBe("string");
    expect(payload.actions).toBe(MCP_IMPLEMENTED_ACTIONS);
  });

  it("carries the actions this build added, not just the original set", () => {
    const actions = buildShellStatusPayload().actions as string[];
    expect(actions).toEqual(
      expect.arrayContaining([
        "client_status",
        "export_svg",
        "vector_draw",
        "vector_update",
        "vector_delete",
        "resize_artboard",
        "validate_canvas",
      ]),
    );
    expect(actions).not.toContain("search_unsplash");
  });
});
