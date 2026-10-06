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
export function subscribeToMCPActions(
  handler: (data: MCPActionEnvelope) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribe: (() => void) | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const attach = () => {
    unsubscribe = EventsOn("mcp:action", handler);
  };

  if ((window as any).runtime?.EventsOnMultiple) {
    attach();
    return () => {
      unsubscribe?.();
      unsubscribe = undefined;
    };
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

  return () => {
    if (interval) clearInterval(interval);
    if (timeout) clearTimeout(timeout);
    unsubscribe?.();
    unsubscribe = undefined;
  };
}
