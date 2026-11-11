import { getNodeBounds, type SaraswatiScene } from "@/lib/saraswati";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { NEW_TEXT_PLACEHOLDER } from "./store/insert-store";

type Props = {
  scene: SaraswatiScene;
  edit: {
    nodeId: string;
    value: string;
  };
  scale: number;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

export default function SceneInlineTextEditor({
  scene,
  edit,
  scale,
  onChange,
  onCommit,
  onCancel,
}: Props) {
  const box = useMemo(() => {
    const node = scene.nodes[edit.nodeId];
    if (!node || node.type !== "text") return null;
    const bounds = getNodeBounds(node);
    return {
      node,
      left: bounds.x * scale,
      top: bounds.y * scale,
      width: Math.max(84, bounds.width * scale),
      minHeight: Math.max(
        34,
        node.fontSize * Math.max(node.lineHeight, 1) * scale,
      ),
    };
  }, [edit.nodeId, scale, scene]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.focus();
    const end = element.value.length;
    if (element.value === NEW_TEXT_PLACEHOLDER) element.select();
    else element.setSelectionRange(end, end);
  }, [edit.nodeId]);

  const minHeight = box?.minHeight ?? 0;
  const boxWidth = box?.width ?? 0;
  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(minHeight, element.scrollHeight)}px`;
  }, [edit.value, minHeight, boxWidth]);

  if (!box) return null;

  return (
    <div
      data-avnac-scene-object="true"
      className="absolute z-[160]"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        minHeight: box.minHeight,
        transformOrigin: "center center 0px",
        opacity: 1,
        overflow: "visible",
      }}
    >
      <textarea
        ref={textareaRef}
        value={edit.value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
            return;
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onCommit();
          }
        }}
        autoFocus
        className="w-full resize-none overflow-hidden whitespace-pre-wrap break-words border-0 bg-transparent p-0 text-neutral-900 outline-none ring-0"
        style={{
          minHeight: box.minHeight,
          fontFamily: box.node.fontFamily,
          fontSize: `${Math.max(10, box.node.fontSize * scale)}px`,
          fontWeight: box.node.fontWeight,
          fontStyle: box.node.fontStyle,
          lineHeight: `${Math.max(1, box.node.lineHeight)}`,
          textAlign: box.node.textAlign,
        }}
      />
    </div>
  );
}
