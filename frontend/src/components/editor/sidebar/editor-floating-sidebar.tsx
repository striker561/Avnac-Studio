import { HugeiconsIcon } from "@hugeicons/react";
import {
  Album02Icon,
  CloudUploadIcon,
  DashboardCircleIcon,
  Layers02Icon,
  PenTool01Icon,
} from "@hugeicons/core-free-icons";
import { editorSidebarTopValue } from "@/lib/editor-sidebar-panel-layout";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type EditorSidebarPanelId =
  | "layers"
  | "uploads"
  | "images"
  | "vector-board"
  | "apps";

type Item = {
  id: EditorSidebarPanelId;
  label: string;
  icon: typeof Layers02Icon;
};

const ITEMS: Item[] = [
  { id: "layers", label: "Layers", icon: Layers02Icon },
  { id: "uploads", label: "Uploads", icon: CloudUploadIcon },
  { id: "images", label: "Images", icon: Album02Icon },
  { id: "vector-board", label: "Vectors", icon: PenTool01Icon },
  { id: "apps", label: "Apps", icon: DashboardCircleIcon },
];

type Props = {
  activePanel: EditorSidebarPanelId | null;
  onSelectPanel: (id: EditorSidebarPanelId) => void;
  disabled?: boolean;
  hidden?: boolean;
};

type DragState = {
  startY: number;
  top: number;
};

const SIDEBAR_BOTTOM_GAP_PX = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function EditorFloatingSidebar({
  activePanel,
  onSelectPanel,
  disabled,
  hidden,
}: Props) {
  const navRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const defaultTopRef = useRef<number | null>(null);
  const [sidebarTop, setSidebarTop] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const getDefaultTop = useCallback(() => {
    if (defaultTopRef.current !== null) return defaultTopRef.current;
    const nav = navRef.current;
    if (!nav) return 0;
    const computedTop = Number.parseFloat(window.getComputedStyle(nav).top);
    return Number.isFinite(computedTop) ? computedTop : 0;
  }, []);

  const clampSidebarTop = useCallback(
    (top: number) => {
      const nav = navRef.current;
      const minTop = getDefaultTop();
      if (!nav) return Math.max(top, minTop);
      const maxTop = Math.max(
        minTop,
        window.innerHeight - nav.offsetHeight - SIDEBAR_BOTTOM_GAP_PX,
      );
      return clamp(top, minTop, maxTop);
    },
    [getDefaultTop],
  );

  const snapSidebarTop = useCallback(
    (top: number) => {
      const nav = navRef.current;
      const minTop = getDefaultTop();
      if (!nav) return clampSidebarTop(top);
      const maxTop = Math.max(
        minTop,
        window.innerHeight - nav.offsetHeight - SIDEBAR_BOTTOM_GAP_PX,
      );
      const middleTop = minTop + Math.max(0, (maxTop - minTop) / 2);
      const clampedTop = clamp(top, minTop, maxTop);
      const snapPoints = [minTop, middleTop, maxTop].map((value) =>
        Math.round(value),
      );
      return snapPoints.reduce((closest, value) =>
        Math.abs(value - clampedTop) < Math.abs(closest - clampedTop)
          ? value
          : closest,
      );
    },
    [clampSidebarTop, getDefaultTop],
  );

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const computedTop = Number.parseFloat(window.getComputedStyle(nav).top);
    if (!Number.isFinite(computedTop)) return;
    defaultTopRef.current = computedTop;
    setSidebarTop((current) => current ?? computedTop);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (sidebarTop === null) return;
    root.style.setProperty(
      "--avnac-editor-sidebar-top",
      `${Math.round(sidebarTop)}px`,
    );
  }, [sidebarTop]);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty(
        "--avnac-editor-sidebar-top",
      );
    },
    [],
  );

  useEffect(() => {
    const onResize = () => {
      setSidebarTop((current) =>
        current === null ? current : clampSidebarTop(current),
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampSidebarTop]);

  useEffect(() => {
    if (!dragging) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setSidebarTop(clampSidebarTop(drag.top + event.clientY - drag.startY));
    };

    const stopDragging = () => {
      dragRef.current = null;
      setSidebarTop((current) =>
        current === null ? current : snapSidebarTop(current),
      );
      setDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", stopDragging, true);
    window.addEventListener("pointercancel", stopDragging, true);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", stopDragging, true);
      window.removeEventListener("pointercancel", stopDragging, true);
    };
  }, [clampSidebarTop, dragging, snapSidebarTop]);

  const onHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        startY: event.clientY,
        top: sidebarTop ?? getDefaultTop(),
      };
      setDragging(true);
    },
    [getDefaultTop, sidebarTop],
  );

  return (
    <nav
      ref={navRef}
      data-avnac-chrome
      aria-label="Editor tools"
      className={[
        "pointer-events-auto fixed left-3 z-[95] flex flex-col gap-1 rounded-[1.75rem] border border-black/[0.08] bg-white/90 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.8)_inset] backdrop-blur-xl transition-[top,opacity] duration-150",
        disabled ? "pointer-events-none opacity-40" : "",
        hidden ? "pointer-events-none opacity-0" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        top:
          sidebarTop === null
            ? editorSidebarTopValue
            : `${Math.round(sidebarTop)}px`,
      }}
    >
      <button
        type="button"
        className={[
          "flex h-6 items-center justify-center rounded-full text-neutral-400 transition-colors",
          "hover:bg-black/[0.04] hover:text-neutral-700 active:cursor-grabbing",
          dragging ? "bg-black/[0.05] text-neutral-700" : "",
        ].join(" ")}
        title="Move sidebar"
        aria-label="Move sidebar"
        onPointerDown={onHandlePointerDown}
        style={{ touchAction: "none" }}
      >
        <span className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="h-1 w-1 rounded-full bg-current" />
          ))}
        </span>
      </button>
      {ITEMS.map((item) => {
        const active = activePanel === item.id;
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={item.label}
            aria-label={item.label}
            onClick={() => onSelectPanel(item.id)}
            className={[
              "flex size-10 shrink-0 items-center justify-center rounded-2xl transition-[background,color,box-shadow]",
              active
                ? "bg-black/[0.04] text-neutral-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                : "text-neutral-700 hover:bg-black/[0.06] hover:text-neutral-900",
              disabled ? "cursor-not-allowed" : "",
            ].join(" ")}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={20}
              strokeWidth={1.65}
              className="shrink-0"
            />
          </button>
        );
      })}
    </nav>
  );
}
