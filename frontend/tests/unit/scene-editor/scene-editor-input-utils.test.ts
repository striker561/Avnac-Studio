// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  shouldIgnoreEditorHotkeys,
  shouldStartViewportPan,
} from "@/features/scene-editor/scene-editor-input-utils";

describe("shouldIgnoreEditorHotkeys", () => {
  it("ignores text-entry targets", () => {
    const input = document.createElement("input");
    expect(shouldIgnoreEditorHotkeys(input, false)).toBe(true);

    const textarea = document.createElement("textarea");
    expect(shouldIgnoreEditorHotkeys(textarea, false)).toBe(true);

    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    expect(shouldIgnoreEditorHotkeys(editable, false)).toBe(true);
  });

  it("does not ignore general editor chrome", () => {
    const chromeButton = document.createElement("button");
    chromeButton.setAttribute("data-avnac-chrome", "true");
    expect(shouldIgnoreEditorHotkeys(chromeButton, false)).toBe(false);
  });

  it("ignores all shortcuts during inline text editing", () => {
    const chromeButton = document.createElement("button");
    chromeButton.setAttribute("data-avnac-chrome", "true");
    expect(shouldIgnoreEditorHotkeys(chromeButton, true)).toBe(true);
  });
});

describe("shouldStartViewportPan", () => {
  it("allows middle-click pan from normal canvas targets", () => {
    const target = document.createElement("div");
    expect(
      shouldStartViewportPan({
        target,
        button: 1,
        pointerType: "mouse",
        spaceHeld: false,
        hasInlineTextEdit: false,
      }),
    ).toBe(true);
  });

  it("allows primary-button pan only while space is held", () => {
    const target = document.createElement("div");
    expect(
      shouldStartViewportPan({
        target,
        button: 0,
        pointerType: "mouse",
        spaceHeld: true,
        hasInlineTextEdit: false,
      }),
    ).toBe(true);

    expect(
      shouldStartViewportPan({
        target,
        button: 0,
        pointerType: "mouse",
        spaceHeld: false,
        hasInlineTextEdit: false,
      }),
    ).toBe(false);
  });

  it("blocks viewport pan from text-entry, chrome, touch, and inline text edit states", () => {
    const input = document.createElement("input");
    expect(
      shouldStartViewportPan({
        target: input,
        button: 1,
        pointerType: "mouse",
        spaceHeld: false,
        hasInlineTextEdit: false,
      }),
    ).toBe(false);

    const chromeButton = document.createElement("button");
    chromeButton.setAttribute("data-avnac-chrome", "true");
    expect(
      shouldStartViewportPan({
        target: chromeButton,
        button: 1,
        pointerType: "mouse",
        spaceHeld: false,
        hasInlineTextEdit: false,
      }),
    ).toBe(false);

    const target = document.createElement("div");
    expect(
      shouldStartViewportPan({
        target,
        button: 1,
        pointerType: "touch",
        spaceHeld: false,
        hasInlineTextEdit: false,
      }),
    ).toBe(false);

    expect(
      shouldStartViewportPan({
        target,
        button: 1,
        pointerType: "mouse",
        spaceHeld: false,
        hasInlineTextEdit: true,
      }),
    ).toBe(false);
  });
});
