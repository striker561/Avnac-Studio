/**
 * Wails event-bus wiring for MCP tool actions.
 *
 * The Go MCP server emits an "mcp:action" event per tool call and blocks on
 * SubmitResponse until the frontend replies. This module owns only the
 * subscription mechanics (including the early-boot window where the Wails
 * runtime is not injected yet); the handler lives in
 * features/scene-editor/use-mcp-actions.ts.
 *
 * Single-subscriber by design: the scene editor root route owns the one
 * subscription for the app's lifetime.
 */

import { EventsOn } from "../../../wailsjs/runtime/runtime";
import type { MCPActionEnvelope } from "@/lib/mcp/payload";

export type { MCPActionEnvelope };

/**
 * Subscribe to "mcp:action" events. Returns an unsubscribe function that is
 * safe to call at any time (before or after the listener attaches).
 */
type McpWindow = Window & {
  __avnacMcpActionCleanup?: () => void;
  __avnacMcpActionHandlerId?: string;
};

/**
 * Subscribe to "mcp:action" events. Returns an unsubscribe function that is
 * safe to call at any time (before or after the listener attaches).
 *
 * HMR and StrictMode can mount a new scene route before the old one unmounts.
 * A stale listener would keep answering actions with an older action switch —
 * exactly the "Unknown action 'vector_draw'" failure mode. The window-level
 * cleanup slot makes the newest subscription replace the previous one.
 */
/** Id of the currently attached MCP action handler (diagnostics only). */
export function getMCPActionHandlerId(): string | null {
  if (typeof window === "undefined") return null;
  return (window as McpWindow).__avnacMcpActionHandlerId ?? null;
}

export function subscribeToMCPActions(
  handler: (data: MCPActionEnvelope) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const mcpWindow = window as McpWindow;
  mcpWindow.__avnacMcpActionCleanup?.();

  let unsubscribe: (() => void) | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const handlerId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "handler-" + Math.random().toString(36).slice(2);

  const attach = () => {
    unsubscribe = EventsOn("mcp:action", handler);
  };

  const cleanup = () => {
    if (interval) clearInterval(interval);
    if (timeout) clearTimeout(timeout);
    unsubscribe?.();
    unsubscribe = undefined;
    if (mcpWindow.__avnacMcpActionCleanup === cleanup) {
      delete mcpWindow.__avnacMcpActionCleanup;
    }
    if (mcpWindow.__avnacMcpActionHandlerId === handlerId) {
      delete mcpWindow.__avnacMcpActionHandlerId;
    }
  };

  mcpWindow.__avnacMcpActionHandlerId = handlerId;
  mcpWindow.__avnacMcpActionCleanup = cleanup;

  if ((window as any).runtime?.EventsOnMultiple) {
    attach();
    return cleanup;
  }

  // The Wails runtime is not injected yet (early boot) — poll briefly for it.
  interval = setInterval(() => {
    if ((window as any).runtime?.EventsOnMultiple) {
      clearInterval(interval);
      clearTimeout(timeout);
      attach();
    }
  }, 100);
  timeout = setTimeout(() => clearInterval(interval), 10000);

  return cleanup;
}
