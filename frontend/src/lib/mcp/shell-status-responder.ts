/**
 * Answers `client_status` from the app shell, so Settings can check what the
 * running frontend implements while no design is open.
 *
 * The scene route owns every other action, and it also answers `client_status`
 * with page and undo detail when it is mounted — so this responder stays silent
 * whenever a scene handler is attached. It exists for the one case the scene
 * dispatcher cannot cover: the settings page is a different route, so the
 * editor is unmounted exactly when the panel asks.
 *
 * Kept out of `subscribeToMCPActions` on purpose: that subscription replaces the
 * previous one, and the scene route's subscription must not evict this.
 */
import { SubmitResponse } from "../../../wailsjs/go/mcp/AvnacMCP";
import { EventsOn } from "../../../wailsjs/runtime/runtime";
import { MCP_IMPLEMENTED_ACTIONS } from "./actions";
import { getMCPActionHandlerId, getMCPClientId } from "./transport";

type MCPActionEnvelope = {
  action?: string;
  payload?: unknown;
  requestId?: string;
};

type ResponderWindow = Window & { __avnacShellStatusMounted?: boolean };

const SHELL_ACTION = "client_status";

/** The reply the shell sends for client_status, kept pure for tests. */
export function buildShellStatusPayload(): Record<string, unknown> {
  return {
    success: true,
    clientId: getMCPClientId(),
    actionHandlerId: "app-shell",
    revision: 0,
    actions: MCP_IMPLEMENTED_ACTIONS,
    source: "app-shell",
    message: "No design is open; reporting the app shell's action list.",
  };
}

function envelopeOf(data: unknown): MCPActionEnvelope | null {
  if (Array.isArray(data)) {
    return (data[0] as MCPActionEnvelope) ?? null;
  }
  return (data as MCPActionEnvelope) ?? null;
}

/**
 * Subscribe once per page. Idempotent, so a hot reload that re-runs the entry
 * module does not stack a second listener.
 */
export function mountShellStatusResponder(): void {
  if (typeof window === "undefined") return;
  const target = window as ResponderWindow;
  if (target.__avnacShellStatusMounted) return;
  target.__avnacShellStatusMounted = true;

  EventsOn("mcp:action", (data: unknown) => {
    const envelope = envelopeOf(data);
    if (!envelope?.action || envelope.action !== SHELL_ACTION) return;
    if (!envelope.requestId) return;
    // A mounted scene route answers with page, revision and undo state; only
    // step in when nothing else can.
    if (getMCPActionHandlerId()) return;

    SubmitResponse(envelope.requestId, buildShellStatusPayload());
  });
}
