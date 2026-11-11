/**
 * One-shot hand-off from "insert a text node" to "start editing it".
 *
 * Insertion happens in the store, inline editing lives in local state on the
 * canvas, and the node only exists in the scene after React re-renders — so a
 * callback fired at insert time would read a stale scene. The canvas subscribes
 * here, and starts the edit once the node shows up.
 */

type Listener = (nodeId: string) => void;

let pending: string | null = null;
const listeners = new Set<Listener>();

export function requestInlineTextEdit(nodeId: string) {
  pending = nodeId;
  listeners.forEach((listener) => listener(nodeId));
}

/** The request has been served; drop it so a later render does not replay it. */
export function consumeInlineTextEdit(nodeId: string) {
  if (pending === nodeId) pending = null;
}

export function subscribeInlineTextEdit(listener: Listener) {
  listeners.add(listener);
  if (pending) listener(pending);
  return () => {
    listeners.delete(listener);
  };
}
