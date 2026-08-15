import type { SaraswatiScene } from "@/lib/saraswati";

export function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, [contenteditable="true"]'));
}

export function isChromeTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("[data-avnac-chrome]"))
  );
}

export function shouldIgnoreEditorHotkeys(
  target: EventTarget | null,
  hasInlineTextEdit: boolean,
) {
  if (hasInlineTextEdit) return true;
  return isTextEntryTarget(target);
}

export function shouldStartViewportPan(params: {
  target: EventTarget | null;
  button: number;
  pointerType?: string;
  spaceHeld: boolean;
  hasInlineTextEdit: boolean;
}) {
  const { target, button, pointerType, spaceHeld, hasInlineTextEdit } = params;
  if (hasInlineTextEdit) return false;
  if (isTextEntryTarget(target) || isChromeTarget(target)) return false;
  if (pointerType && pointerType !== "mouse") return false;
  return button === 1 || (button === 0 && spaceHeld);
}

export function collectSelectableNodeIds(
  scene: SaraswatiScene,
  lockedIds: readonly string[],
) {
  return Object.values(scene.nodes)
    .filter((node) => node.id !== scene.root)
    .filter((node) => node.visible !== false)
    .filter((node) => !lockedIds.includes(node.id))
    .map((node) => node.id);
}

/**
 * Resolve a selection to its top-most nodes so a node is never moved twice.
 * Moving a group recursively moves its children, so if a group AND one of its
 * descendants are both selected (e.g. Cmd+A), only the group should move.
 */
export function resolveTopmostSelectedIds(
  scene: SaraswatiScene,
  selectedIds: readonly string[],
): string[] {
  const selected = new Set(selectedIds);
  return selectedIds.filter((id) => {
    const node = scene.nodes[id];
    if (!node) return false;
    let parent = node.parentId;
    while (parent) {
      if (selected.has(parent)) return false;
      parent = scene.nodes[parent]?.parentId ?? null;
    }
    return true;
  });
}

export function reorderChildrenForSelection(params: {
  children: readonly string[];
  selectedId: string;
  mode: "forward" | "backward" | "front" | "back";
}) {
  const { children, selectedId, mode } = params;
  const fromIndex = children.indexOf(selectedId);
  if (fromIndex < 0) return null;

  let toIndex = fromIndex;
  if (mode === "forward")
    toIndex = Math.min(children.length - 1, fromIndex + 1);
  if (mode === "backward") toIndex = Math.max(0, fromIndex - 1);
  if (mode === "front") toIndex = children.length - 1;
  if (mode === "back") toIndex = 0;
  if (toIndex === fromIndex) return null;

  const next = [...children];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return null;
  next.splice(toIndex, 0, item);
  return next;
}

export function extractClipboardImageFiles(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) return [] as File[];
  const files: File[] = [];
  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (!file || !file.type.startsWith("image/")) continue;
    files.push(file);
  }
  return files;
}

export async function readNavigatorClipboardImageFiles() {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.read !== "function"
  ) {
    return [] as File[];
  }

  try {
    const items = await navigator.clipboard.read();
    const files: File[] = [];
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      const extension = imageType.split("/")[1] ?? "png";
      files.push(
        new File([blob], `clipboard-image-${Date.now()}.${extension}`, {
          type: blob.type || imageType,
        }),
      );
    }
    return files;
  } catch {
    return [] as File[];
  }
}
