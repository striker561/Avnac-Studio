/**
 * Full-page scene editor — rendered at /scene?id=...
 * Standalone; does not depend on FabricEditor.  All state flows through
 * the global useSceneEditorStore — no prop drilling.
 */
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  FileExportIcon,
  FileImportIcon,
  Home05Icon,
} from "@hugeicons/core-free-icons";
import EditorRangeSlider from "@/components/editor/shared/editor-range-slider";
import { floatingToolbarPopoverMenuClass } from "@/components/editor/shared/floating-toolbar-shell";
import EditorAiPanel from "@/components/editor/sidebar/editor-ai-panel";
import EditorAppsPanel from "@/components/editor/sidebar/editor-apps-panel";
import EditorFloatingSidebar from "@/components/editor/sidebar/editor-floating-sidebar";
import EditorImagesPanel from "@/components/editor/sidebar/editor-images-panel";
import EditorLayersPanel from "@/components/editor/sidebar/editor-layers-panel";
import EditorUploadsPanel from "@/components/editor/sidebar/editor-uploads-panel";
import EditorVectorBoardPanel from "@/components/editor/vector-boards/editor-vector-board-panel";
import VectorBoardWorkspace from "@/components/editor/vector-boards/vector-board-workspace";
import {
  emptyVectorBoardDocument,
  type VectorBoardDocument,
} from "@/lib/avnac-vector-board-document";
import {
  loadVectorBoardDocs,
  loadVectorBoards,
  mergeVectorBoardDocsForMeta,
  saveVectorBoardDocs,
  saveVectorBoards,
  type AvnacVectorBoardMeta,
} from "@/lib/avnac-vector-boards-storage";
import {
  getSceneDeveloperMode,
  getSceneSnapIntensity,
  loadSceneRotationSensitivityFromConfig,
  loadSceneSnapIntensityFromConfig,
  onSceneDeveloperModeChange,
  onSceneSnapIntensityChange,
} from "@/lib/scene-editor-preferences";
import SceneEditorCanvas from "./scene-editor-canvas";
import SceneInspectorPanel from "./scene-inspector-panel";
import BottomFloatingToolbar from "./tools/bottom-floating-toolbar";
import SceneSelectionBar from "./tools/scene-selection-bar";
import { useLayerPanelTools } from "./tools/use-layer-panel-tools";
import { useSceneEditorAiController } from "./use-scene-editor-ai-controller";
import { useSceneEditorStore } from "./store";

// ─── Toolbar presentation ───────────────────────────────────────────────────────────────────
const _topBarShellClass = [
  "relative z-[70] flex min-h-14 items-center gap-2 overflow-visible rounded-[1.75rem] border border-black/[0.08] bg-white/92 px-2.5 py-2",
  "shadow-[0_8px_30px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.8)_inset] backdrop-blur-xl",
].join(" ");
const _topBarGroupClass = [
  "flex items-center gap-1 rounded-full border border-black/[0.06] bg-black/[0.02] p-1",
  "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]",
].join(" ");
const _topBarHomeLinkClass =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-neutral-700 no-underline transition-colors hover:bg-black/[0.08] hover:text-neutral-900";
const _topBarDividerClass = "h-6 w-px shrink-0 bg-black/[0.06]";
const _titleFieldClass = [
  "min-w-0 rounded-full bg-white/85 px-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]",
  "transition-shadow focus-within:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_0_0_3px_rgba(24,119,242,0.08)]",
].join(" ");
const _pageIconButtonClass = [
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors",
  "hover:bg-black/[0.08] hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40",
].join(" ");
const _tabRailClass = [
  "flex min-w-max items-center gap-1 rounded-full bg-white/72 px-1 py-0.5",
  "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]",
].join(" ");
const _tabRailFadeClass =
  "pointer-events-none absolute inset-y-0 z-10 w-5 bg-gradient-to-r from-white via-white/90 to-transparent";
const _pageTabButtonClass = [
  "inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] font-medium transition-[background,color,box-shadow]",
  "focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");
const _pageActionButtonClass = [
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium",
  "text-neutral-800 transition-colors hover:bg-black/[0.08]",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");
const _destructiveIconButtonClass = [
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors",
  "hover:bg-black/[0.08] hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40",
  "text-neutral-500 hover:bg-red-500/[0.08] hover:text-red-600",
].join(" ");
const _actionMenuPopoverClass =
  "absolute right-0 top-full z-[140] mt-2 w-56 p-1.5";
const _actionMenuButtonClass = [
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-neutral-800",
  "hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-40",
].join(" ");
const _actionMenuSeparatorClass = "my-1 border-t border-black/[0.06]";
const _pngCardClass =
  "mx-1 mb-1 rounded-xl bg-(--surface-subtle) px-3 pb-3 pt-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]";
function _tabButtonStateClass(active: boolean): string {
  return active
    ? "bg-white text-(--text) shadow-[0_4px_14px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.04)]"
    : "text-neutral-700 hover:bg-white/72 hover:text-neutral-900";
}
function _actionChevronClass(open: boolean): string {
  return open ? "rotate-180 transition-transform" : "transition-transform";
}
function _buildPageTabs(
  pageCount: number,
  currentPage: number,
): { index: number; label: string; active: boolean }[] {
  return Array.from({ length: pageCount }, (_, i) => ({
    index: i,
    label: `Page ${i + 1}`,
    active: i === currentPage,
  }));
}

type Props = {
  documentId: string | null;
};

export default function SceneEditorPage({ documentId }: Props) {
  const documentName = useSceneEditorStore((s) => s.documentName);
  const adapterIssueCount = useSceneEditorStore((s) => s.adapterIssueCount);
  const adapterPipeline = useSceneEditorStore((s) => s.adapterPipeline);
  const adapterSchemaVersion = useSceneEditorStore(
    (s) => s.adapterSchemaVersion,
  );
  const saveState = useSceneEditorStore((s) => s.saveState);
  const exportNotice = useSceneEditorStore((s) => s.exportNotice);
  const setExportNotice = useSceneEditorStore((s) => s.setExportNotice);
  const renderStats = useSceneEditorStore((s) => s.renderStats);
  const canvasPan = useSceneEditorStore((s) => s.canvasPan);
  const isLoading = useSceneEditorStore((s) => s.isLoading);
  const loadError = useSceneEditorStore((s) => s.loadError);
  const scene = useSceneEditorStore((s) => s.scene);
  const zoomPercent = useSceneEditorStore((s) => s.zoomPercent);
  const selectedCount = useSceneEditorStore((s) => s.selectedIds.length);
  const focusMode = useSceneEditorStore((s) => s.focusMode);
  const sidebarPanel = useSceneEditorStore((s) => s.sidebarPanel);
  const toggleSidebarPanel = useSceneEditorStore((s) => s.toggleSidebarPanel);
  const setSidebarPanel = useSceneEditorStore((s) => s.setSidebarPanel);
  const insertVectorBoard = useSceneEditorStore((s) => s.insertVectorBoard);
  const pages = useSceneEditorStore((s) => s.pages);
  const currentPage = useSceneEditorStore((s) => s.currentPage);
  const goToPage = useSceneEditorStore((s) => s.goToPage);
  const addPage = useSceneEditorStore((s) => s.addPage);
  const deletePage = useSceneEditorStore((s) => s.deletePage);
  const importPage = useSceneEditorStore((s) => s.importPage);
  const importWorkspace = useSceneEditorStore((s) => s.importWorkspace);
  const exportWorkspace = useSceneEditorStore((s) => s.exportWorkspace);
  const exportCurrentPage = useSceneEditorStore((s) => s.exportCurrentPage);
  const exportPng = useSceneEditorStore((s) => s.exportPng);
  const setDocumentName = useSceneEditorStore((s) => s.setDocumentName);
  const commitDocumentName = useSceneEditorStore((s) => s.commitDocumentName);
  const saveStore = useSceneEditorStore((s) => s.save);
  const flushAutosaveNow = useSceneEditorStore((s) => s.flushAutosaveNow);
  const applySnapIntensity = useSceneEditorStore((s) => s.applySnapIntensity);
  const layerTools = useLayerPanelTools();
  const aiController = useSceneEditorAiController();

  // ─── Toolbar local state ──────────────────────────────────────────────────────────────
  const [actionsOpen, setActionsOpen] = useState(false);
  const [pngExpanded, setPngExpanded] = useState(false);
  const [pngMult, setPngMult] = useState(2);
  const [pngTransparent, setPngTransparent] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const workspaceInputRef = useRef<HTMLInputElement>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);

  const pageCount = pages.length;
  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < pageCount - 1;
  const canDelete = pageCount > 1;
  const pageTabs = useMemo(
    () => _buildPageTabs(pageCount, currentPage),
    [pageCount, currentPage],
  );

  // Close actions menu on outside click
  useEffect(() => {
    if (!actionsOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target as Node)
      ) {
        setActionsOpen(false);
        setPngExpanded(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [actionsOpen]);

  // Page keyboard navigation (Arrow Left/Right, Cmd+N, Cmd+Delete)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'input, textarea, [contenteditable="true"], [data-avnac-chrome]',
        )
      )
        return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void addPage();
        return;
      }
      if (mod && (event.key === "Delete" || event.key === "Backspace")) {
        if (selectedCount > 0) return;
        event.preventDefault();
        void deletePage();
        return;
      }
      if (mod || event.altKey || event.shiftKey) return;
      if (selectedCount > 0) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void goToPage(currentPage - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void goToPage(currentPage + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [addPage, deletePage, goToPage, currentPage, selectedCount]);

  // Flush on page unload
  useEffect(() => {
    const onBeforeUnload = () => {
      void flushAutosaveNow().catch((err) => {
        // Wails can tear down the bridge channel before page lifecycle events
        // finish; ignore those transient transport errors during unload.
        if (
          String(err).includes('can\'t access property "send"') ||
          String(err).includes("Unknown message from front end")
        ) {
          return;
        }
        console.warn("SceneEditor: unload flush failed", err);
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void saveStore();
    };
  }, [flushAutosaveNow, saveStore]);

  useEffect(() => {
    // Seed from local cache immediately, then refresh from native config.
    applySnapIntensity(getSceneSnapIntensity());
    void loadSceneSnapIntensityFromConfig().then((value) => {
      applySnapIntensity(value);
    });

    return onSceneSnapIntensityChange((value) => {
      applySnapIntensity(value);
    });
  }, [applySnapIntensity]);

  useEffect(() => {
    // Trigger loading rotation sensitivity from the Go config so the
    // preferences event fires and the interactions hook picks it up.
    void loadSceneRotationSensitivityFromConfig();
  }, []);

  useEffect(() => {
    return onSceneDeveloperModeChange((value) => {
      setDeveloperMode(value);
    });
  }, []);

  const compatibilityMessage = useMemo(() => {
    if (adapterIssueCount > 0) {
      return `${adapterIssueCount} older item${adapterIssueCount === 1 ? "" : "s"} may look slightly different`;
    }
    if (adapterSchemaVersion === 1) {
      return "Classic Avnac files are fully supported";
    }
    if (adapterSchemaVersion != null) {
      return `File compatibility mode: schema v${adapterSchemaVersion}`;
    }
    return "File compatibility mode is active";
  }, [adapterIssueCount, adapterSchemaVersion]);

  // PNG export handler
  const handleExportPng = useCallback(() => {
    void exportPng(pngMult, pngTransparent);
    setActionsOpen(false);
    setPngExpanded(false);
  }, [exportPng, pngMult, pngTransparent]);

  const [vectorBoards, setVectorBoards] = useState<AvnacVectorBoardMeta[]>([]);
  const [vectorBoardDocs, setVectorBoardDocs] = useState<
    Record<string, VectorBoardDocument>
  >({});
  const [vectorBoardListReady, setVectorBoardListReady] = useState(false);
  const [vectorWorkspaceId, setVectorWorkspaceId] = useState<string | null>(
    null,
  );
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [developerMode, setDeveloperMode] = useState(() =>
    getSceneDeveloperMode(),
  );
  const vectorBoardsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const vectorBoardDocsSaveTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const createVectorBoard = useCallback(() => {
    const id = crypto.randomUUID();
    setVectorBoards((prev) => {
      const n = prev.length + 1;
      return [
        ...prev,
        { id, name: `Vector board ${n}`, createdAt: Date.now() },
      ];
    });
    setVectorBoardDocs((prev) => ({
      ...prev,
      [id]: emptyVectorBoardDocument(),
    }));
    setVectorWorkspaceId(id);
  }, []);

  const openVectorBoardWorkspace = useCallback((id: string) => {
    setVectorWorkspaceId(id);
  }, []);

  const closeVectorWorkspace = useCallback(() => {
    setVectorWorkspaceId(null);
  }, []);

  const onVectorBoardDocumentChange = useCallback(
    (boardId: string, doc: VectorBoardDocument) => {
      setVectorBoardDocs((prev) => ({ ...prev, [boardId]: doc }));
    },
    [],
  );

  const deleteVectorBoard = useCallback((boardId: string) => {
    setVectorWorkspaceId((cur) => (cur === boardId ? null : cur));
    setVectorBoards((prev) => prev.filter((b) => b.id !== boardId));
    setVectorBoardDocs((prev) => {
      const next = { ...prev };
      delete next[boardId];
      return next;
    });
  }, []);

  const vectorWorkspaceName = useMemo(() => {
    if (!vectorWorkspaceId) return "";
    return (
      vectorBoards.find((b) => b.id === vectorWorkspaceId)?.name ??
      "Vector board"
    );
  }, [vectorBoards, vectorWorkspaceId]);

  useEffect(() => {
    setVectorWorkspaceId(null);
    setVectorBoardListReady(false);
    let cancelled = false;
    if (!documentId) {
      setVectorBoards([]);
      setVectorBoardDocs({});
      setVectorBoardListReady(true);
      return;
    }
    void (async () => {
      const [boards, docs] = await Promise.all([
        loadVectorBoards(documentId),
        loadVectorBoardDocs(documentId),
      ]);
      if (cancelled) return;
      const merged = mergeVectorBoardDocsForMeta(boards, docs);
      setVectorBoards(boards);
      setVectorBoardDocs(merged);
      setVectorBoardListReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    if (!documentId || !vectorBoardListReady) return;
    if (vectorBoardsSaveTimerRef.current) {
      clearTimeout(vectorBoardsSaveTimerRef.current);
    }
    vectorBoardsSaveTimerRef.current = setTimeout(() => {
      vectorBoardsSaveTimerRef.current = null;
      void saveVectorBoards(documentId, vectorBoards).catch((err) => {
        console.error("SceneEditor: vector board save failed", err);
      });
    }, 800);

    return () => {
      if (vectorBoardsSaveTimerRef.current) {
        clearTimeout(vectorBoardsSaveTimerRef.current);
        vectorBoardsSaveTimerRef.current = null;
      }
    };
  }, [documentId, vectorBoards, vectorBoardListReady]);

  useEffect(() => {
    if (!documentId || !vectorBoardListReady) return;
    if (vectorBoardDocsSaveTimerRef.current) {
      clearTimeout(vectorBoardDocsSaveTimerRef.current);
    }
    vectorBoardDocsSaveTimerRef.current = setTimeout(() => {
      vectorBoardDocsSaveTimerRef.current = null;
      void saveVectorBoardDocs(documentId, vectorBoardDocs).catch((err) => {
        console.error("SceneEditor: vector board document save failed", err);
      });
    }, 800);

    return () => {
      if (vectorBoardDocsSaveTimerRef.current) {
        clearTimeout(vectorBoardDocsSaveTimerRef.current);
        vectorBoardDocsSaveTimerRef.current = null;
      }
    };
  }, [documentId, vectorBoardDocs, vectorBoardListReady]);

  useEffect(() => {
    return () => {
      if (vectorBoardsSaveTimerRef.current) {
        clearTimeout(vectorBoardsSaveTimerRef.current);
        vectorBoardsSaveTimerRef.current = null;
      }
      if (vectorBoardDocsSaveTimerRef.current) {
        clearTimeout(vectorBoardDocsSaveTimerRef.current);
        vectorBoardDocsSaveTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className="flex h-dvh min-h-0 flex-col bg-(--surface-subtle)"
      data-avnac-adapter-pipeline={adapterPipeline}
      data-avnac-adapter-schema={
        adapterSchemaVersion != null ? String(adapterSchemaVersion) : "unknown"
      }
    >
      {/* ── Floating toolbar ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
        <div className={_topBarShellClass}>
          {/* Group 1: Home + divider + document title */}
          <div className={`${_topBarGroupClass} shrink-0`}>
            <Link
              to="/files"
              className={_topBarHomeLinkClass}
              aria-label="All files"
              title="All files"
            >
              <HugeiconsIcon
                icon={Home05Icon}
                size={18}
                strokeWidth={1.65}
                className="shrink-0"
              />
            </Link>
            <span className={_topBarDividerClass} aria-hidden />
            <div className={`${_titleFieldClass} min-w-0 w-28 sm:w-44`}>
              <label htmlFor="avnac-doc-title" className="sr-only">
                Document name
              </label>
              <input
                id="avnac-doc-title"
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                onBlur={() => void commitDocumentName()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="m-0 h-9 w-full min-w-0 truncate border-0 bg-transparent text-sm font-medium leading-snug text-(--text) outline-none focus:ring-0"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Group 2: Page tabs + prev / next / add */}
          <div className={`${_topBarGroupClass} min-w-0 flex-1`}>
            <button
              type="button"
              className={_pageIconButtonClass}
              onClick={() => void goToPage(currentPage - 1)}
              disabled={!canGoPrev}
              aria-label="Previous page"
              title="Previous page (ArrowLeft)"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={18}
                strokeWidth={1.8}
              />
            </button>

            <div className="relative min-w-0 flex-1">
              <div className={`${_tabRailFadeClass} left-0 rounded-l-full`} />
              <div
                className={`${_tabRailFadeClass} right-0 rotate-180 rounded-r-full`}
              />
              <div className="overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className={_tabRailClass}>
                  {pageTabs.map((tab) => (
                    <button
                      key={tab.index}
                      type="button"
                      className={[
                        _pageTabButtonClass,
                        _tabButtonStateClass(tab.active),
                      ].join(" ")}
                      onClick={() => void goToPage(tab.index)}
                      aria-current={tab.active ? "page" : undefined}
                      title={tab.label}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className={_pageIconButtonClass}
              onClick={() => void goToPage(currentPage + 1)}
              disabled={!canGoNext}
              aria-label="Next page"
              title="Next page (ArrowRight)"
            >
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={18}
                strokeWidth={1.8}
              />
            </button>

            <button
              type="button"
              className={_pageIconButtonClass}
              onClick={() => void addPage()}
              aria-label="New page"
              title="New page (Cmd/Ctrl+N)"
            >
              <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.75} />
            </button>
          </div>

          {/* Group 3: File actions + delete page */}
          <div className={`${_topBarGroupClass} shrink-0`}>
            <div
              ref={actionsRef}
              className="relative shrink-0"
              data-avnac-chrome
            >
              <button
                type="button"
                className={[
                  _pageActionButtonClass,
                  actionsOpen ? "bg-black/[0.05]" : "",
                ].join(" ")}
                onClick={() => {
                  setActionsOpen((v) => !v);
                  if (actionsOpen) setPngExpanded(false);
                }}
                aria-label="File actions"
              >
                <HugeiconsIcon
                  icon={FileExportIcon}
                  size={17}
                  strokeWidth={1.75}
                />
                <span className="hidden sm:inline">File</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={14}
                  strokeWidth={2}
                  className={_actionChevronClass(actionsOpen)}
                />
              </button>

              {actionsOpen && (
                <div
                  className={[
                    floatingToolbarPopoverMenuClass,
                    _actionMenuPopoverClass,
                  ].join(" ")}
                >
                  <button
                    type="button"
                    className={_actionMenuButtonClass}
                    onClick={() => {
                      setActionsOpen(false);
                      void exportWorkspace();
                    }}
                  >
                    <HugeiconsIcon
                      icon={FileExportIcon}
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-neutral-700"
                    />
                    Export workspace
                  </button>
                  <button
                    type="button"
                    className={_actionMenuButtonClass}
                    onClick={() => {
                      setActionsOpen(false);
                      void exportCurrentPage();
                    }}
                  >
                    <HugeiconsIcon
                      icon={FileExportIcon}
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-neutral-700"
                    />
                    Export page
                  </button>

                  <div className={_actionMenuSeparatorClass} />

                  <button
                    type="button"
                    className={_actionMenuButtonClass}
                    onClick={() => setPngExpanded((v) => !v)}
                  >
                    <HugeiconsIcon
                      icon={FileExportIcon}
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-neutral-700"
                    />
                    <span className="flex-1 text-left">Download canvas</span>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={13}
                      strokeWidth={2}
                      className={_actionChevronClass(pngExpanded)}
                    />
                  </button>

                  {pngExpanded && (
                    <div className={_pngCardClass}>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-(--text-muted)">
                        Scale {pngMult}×
                      </p>
                      <EditorRangeSlider
                        min={1}
                        max={3}
                        step={1}
                        value={pngMult}
                        onChange={setPngMult}
                        aria-label="PNG export scale"
                        aria-valuemin={1}
                        aria-valuemax={3}
                        aria-valuenow={pngMult}
                        trackClassName="mb-3 w-full"
                      />
                      <label className="mb-3 flex cursor-pointer items-center gap-2 text-[12px] text-(--text)">
                        <input
                          type="checkbox"
                          checked={pngTransparent}
                          onChange={(e) => setPngTransparent(e.target.checked)}
                          className="size-3.5 shrink-0 rounded border border-black/20"
                          style={{ accentColor: "var(--accent)" }}
                        />
                        Transparent background
                      </label>
                      <button
                        type="button"
                        className="w-full rounded-lg cursor-pointer bg-neutral-900 py-2 text-[12px] font-medium text-white transition-colors hover:bg-neutral-800"
                        onClick={handleExportPng}
                      >
                        Download PNG
                      </button>
                    </div>
                  )}

                  <div className={_actionMenuSeparatorClass} />

                  <button
                    type="button"
                    className={_actionMenuButtonClass}
                    onClick={() => {
                      setActionsOpen(false);
                      workspaceInputRef.current?.click();
                    }}
                  >
                    <HugeiconsIcon
                      icon={FileImportIcon}
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-neutral-700"
                    />
                    Import workspace
                  </button>
                  <button
                    type="button"
                    className={_actionMenuButtonClass}
                    onClick={() => {
                      setActionsOpen(false);
                      pageInputRef.current?.click();
                    }}
                  >
                    <HugeiconsIcon
                      icon={FileImportIcon}
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-neutral-700"
                    />
                    Import page
                  </button>
                </div>
              )}
            </div>

            <span className={_topBarDividerClass} aria-hidden />

            <button
              type="button"
              className={_destructiveIconButtonClass}
              onClick={() => void deletePage()}
              disabled={!canDelete}
              aria-label="Delete page"
              title="Delete page (Cmd/Ctrl+Delete)"
            >
              <HugeiconsIcon icon={Delete02Icon} size={17} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={workspaceInputRef}
        type="file"
        accept=".workspace.avnac,.avnac,.json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importWorkspace(file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={pageInputRef}
        type="file"
        accept=".page.avnac,.avnac,.json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importPage(file);
          event.currentTarget.value = "";
        }}
      />

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
          Loading document…
        </div>
      )}

      {loadError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <p className="text-sm font-medium text-red-600">Failed to load</p>
          <p className="max-w-sm text-center text-xs text-neutral-500">
            {loadError}
          </p>
          <Link
            to="/files"
            className="mt-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Back to files
          </Link>
        </div>
      )}

      {!isLoading && !loadError && scene && (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {exportNotice ? (
            <div
              className="flex shrink-0 items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
              role="alert"
            >
              <span>{exportNotice}</span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium hover:bg-red-100"
                onClick={() => setExportNotice(null)}
              >
                Dismiss
              </button>
            </div>
          ) : null}
          <SceneSelectionBar />
          <div className="relative flex min-h-0 flex-1">
            <SceneEditorCanvas
              shortcutsOpen={shortcutsOpen}
              onOpenShortcuts={() => setShortcutsOpen(true)}
              onCloseShortcuts={() => setShortcutsOpen(false)}
              developerMode={developerMode}
            />
            <SceneInspectorPanel />
            <BottomFloatingToolbar />
            <EditorFloatingSidebar
              activePanel={sidebarPanel}
              onSelectPanel={toggleSidebarPanel}
              hidden={focusMode}
            />
            <EditorLayersPanel
              open={sidebarPanel === "layers"}
              onClose={() => setSidebarPanel(null)}
              rows={layerTools.rows}
              onSelectLayer={layerTools.onSelectLayer}
              onToggleVisible={layerTools.onToggleVisible}
              onBringForward={layerTools.onBringForward}
              onSendBackward={layerTools.onSendBackward}
              onReorder={layerTools.onReorder}
              onRenameLayer={layerTools.onRenameLayer}
            />
            <EditorUploadsPanel
              open={sidebarPanel === "uploads"}
              onClose={() => setSidebarPanel(null)}
            />
            <EditorImagesPanel
              open={sidebarPanel === "images"}
              onClose={() => setSidebarPanel(null)}
              controller={aiController}
            />
            <EditorVectorBoardPanel
              open={sidebarPanel === "vector-board"}
              onClose={() => setSidebarPanel(null)}
              boards={vectorBoards}
              boardDocs={vectorBoardDocs}
              onCreateNew={createVectorBoard}
              onOpenBoard={openVectorBoardWorkspace}
              onDeleteBoard={deleteVectorBoard}
            />
            <EditorAppsPanel
              open={sidebarPanel === "apps"}
              onClose={() => setSidebarPanel(null)}
              controller={aiController}
            />
            <EditorAiPanel
              open={sidebarPanel === "ai"}
              onClose={() => setSidebarPanel(null)}
              controller={aiController}
            />
            <VectorBoardWorkspace
              open={vectorWorkspaceId != null}
              boardName={vectorWorkspaceName}
              document={
                vectorWorkspaceId
                  ? (vectorBoardDocs[vectorWorkspaceId] ??
                    emptyVectorBoardDocument())
                  : emptyVectorBoardDocument()
              }
              onDocumentChange={(doc) => {
                if (!vectorWorkspaceId) return;
                onVectorBoardDocumentChange(vectorWorkspaceId, doc);
              }}
              onSave={closeVectorWorkspace}
              onSaveAndPlace={() => {
                insertVectorBoard();
                closeVectorWorkspace();
              }}
              onClose={closeVectorWorkspace}
            />
          </div>
        </div>
      )}

      {/* ── Status bar (developer mode only) ────────────────────────────── */}
      {scene && developerMode && (
        <footer className="flex shrink-0 items-center gap-3 border-t border-black/6 bg-white/90 px-4 py-1.5 text-[11px] text-neutral-500 backdrop-blur">
          <div className="flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span>
              {scene.artboard.width} × {scene.artboard.height}px
            </span>
            <span className="text-neutral-300">·</span>
            <span>Sel {selectedCount}</span>
            <span className="text-neutral-300">·</span>
            <span>Zoom {Math.round(zoomPercent)}%</span>
            <span className="text-neutral-300">·</span>
            <span>{compatibilityMessage}</span>
            <span className="text-neutral-300">·</span>
            <span title="Auto-save status">
              {saveState === "saving"
                ? "Saving..."
                : saveState === "dirty"
                  ? "Unsaved changes"
                  : saveState === "error"
                    ? "Could not save"
                    : "All changes saved"}
            </span>
            <span className="text-neutral-300">·</span>
            <span>
              Pan {canvasPan.x},{canvasPan.y}
            </span>
            <span className="text-neutral-300">·</span>
            <span>Render {renderStats.ms.toFixed(1)}ms</span>
            <span className="text-neutral-300">·</span>
            <span>Cmd {renderStats.commands}</span>
            <span className="text-neutral-300">·</span>
            <span
              className={
                renderStats.repaintMode === "partial"
                  ? "font-medium text-emerald-600"
                  : renderStats.repaintMode === "skipped"
                    ? "text-neutral-500"
                    : undefined
              }
              title={
                renderStats.repaintMode === "partial"
                  ? `${renderStats.dirtyRects} dirty region(s), ${renderStats.commandsRepainted} command draw(s), ${renderStats.dirtyCoveragePct.toFixed(1)}% of artboard`
                  : renderStats.repaintMode === "skipped"
                    ? "Scene commands unchanged since last frame"
                    : "Full canvas clear and redraw"
              }
            >
              {renderStats.repaintMode === "partial"
                ? `Partial ${renderStats.dirtyCoveragePct.toFixed(1)}%`
                : renderStats.repaintMode === "skipped"
                  ? "Skipped"
                  : "Full"}
            </span>
            <span className="text-neutral-300">·</span>
            <span>
              {adapterPipeline} · schema v{adapterSchemaVersion ?? "?"}
            </span>
            {adapterIssueCount > 0 && (
              <>
                <span className="text-neutral-300">·</span>
                <span className="text-amber-600">
                  {adapterIssueCount} legacy
                </span>
              </>
            )}
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="ml-auto rounded-md border border-neutral-300 px-2 py-0.5 text-[11px] font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-100"
              title="Show keyboard shortcuts"
            >
              Shortcuts ?
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
