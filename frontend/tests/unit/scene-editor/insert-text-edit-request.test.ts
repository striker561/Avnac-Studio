import { describe, expect, it, vi } from "vitest";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import type { SaraswatiCommand } from "@/lib/saraswati";
import {
  NEW_TEXT_PLACEHOLDER,
  insertText,
  type SceneEditorInsertContext,
} from "@/features/scene-editor/store/insert-store";
import {
  consumeInlineTextEdit,
  requestInlineTextEdit,
  subscribeInlineTextEdit,
} from "@/features/scene-editor/inline-text-edit-bridge";

function buildContext(): {
  context: SceneEditorInsertContext;
  commands: SaraswatiCommand[];
  selected: string[][];
} {
  const scene = createEmptySaraswatiScene({
    width: 800,
    height: 600,
    bg: { type: "solid", color: "#ffffff" },
  });
  const commands: SaraswatiCommand[] = [];
  const selected: string[][] = [];
  return {
    commands,
    selected,
    context: {
      scene,
      selectedIds: [],
      applyCommands: (next) => commands.push(...next),
      setSelectedIds: (ids) => selected.push(ids),
    },
  };
}

describe("insertText", () => {
  it("asks the canvas to start editing the node it just added", () => {
    const { context, commands, selected } = buildContext();
    const listener = vi.fn();
    const unsubscribe = subscribeInlineTextEdit(listener);

    insertText(context);

    expect(commands).toHaveLength(1);
    const added = commands[0];
    expect(added.type).toBe("ADD_NODE");
    if (added.type !== "ADD_NODE") throw new Error("unreachable");
    expect(added.node.type).toBe("text");
    if (added.node.type !== "text") throw new Error("unreachable");

    // Adding text is a promise that you can type: the new node must both be
    // selected and handed to the inline editor, or typing goes nowhere.
    expect(selected).toEqual([[added.node.id]]);
    expect(added.node.text).toBe(NEW_TEXT_PLACEHOLDER);
    expect(listener).toHaveBeenCalledWith(added.node.id);

    // Serve it, as the canvas does once the node is in the scene.
    consumeInlineTextEdit(added.node.id);
    unsubscribe();
  });

  it("serves a request once, so a later render does not reopen the editor", () => {
    const seen: string[] = [];
    const unsubscribe = subscribeInlineTextEdit((id) => seen.push(id));

    requestInlineTextEdit("node-1");
    expect(seen).toEqual(["node-1"]);

    consumeInlineTextEdit("node-1");
    // A fresh subscriber must not replay a request that was already served.
    const late = vi.fn();
    const unsubscribeLate = subscribeInlineTextEdit(late);
    expect(late).not.toHaveBeenCalled();

    unsubscribe();
    unsubscribeLate();
  });
});
