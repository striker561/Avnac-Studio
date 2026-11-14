/**
 * Orchestration for MCP tool actions: the single place where Go-emitted
 * "mcp:action" events meet the scene editor store.
 *
 * handleMCPAction is a thin dispatcher shaped like the engine's applyCommand
 * reducer — one branch per action, one named function per tool. Payload →
 * command conversion lives in lib/mcp/commands.ts (pure), read-only response
 * shaping in lib/mcp/summaries.ts, image rendering in lib/mcp/canvas-export.ts,
 * and the Wails subscription in lib/mcp/transport.ts. Everything here either
 * reads store state, applies commands via store.applyCommands, or submits the
 * MCP response for the request.
 */

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SubmitResponse } from "../../../wailsjs/go/mcp/AvnacMCP";
import { idbGetEditorRecord, idbSetDocumentName } from "@/lib/avnac-editor-idb";
import {
  useSceneEditorStore,
  type SceneSnapshot,
} from "@/features/scene-editor/store";
import { GOOGLE_FONT_FAMILIES } from "@/data/google-font-families";
import { ARTBOARD_PRESETS } from "@/data/artboard-presets";
import {
  ALIGN_KINDS,
  NO_SCENE_ERROR,
  normalizeAlignKind,
  parseColor,
  type MCPActionEnvelope,
  type MCPPayload,
} from "@/lib/mcp/payload";
import {
  buildAlignCommands,
  buildClearCanvasCommands,
  buildDistributeCommands,
  buildFitToArtboardCommands,
  buildModifyElementsCommands,
  buildRenderElementsCommands,
  buildVectorPlaceCommands,
  buildVectorUpdateCommand,
  snapshotNode,
  type TextMeasureRequest,
  type VectorPlacePayload,
} from "@/lib/mcp/commands";
import {
  getSharedTextMeasure,
  layoutTextLines,
  measureTextVerticalMetrics,
} from "@/lib/renderer/backends/canvas2d/text-layout";
import {
  getCachedImageSize,
  loadImageSize,
  loadImageSizes,
} from "@/lib/mcp/image-size";
import { imageNeedsNaturalSize } from "@/lib/mcp/image-fit";
import { ensureGoogleFontsForFamilies } from "@/lib/load-google-font";
import {
  buildCanvasSummary,
  buildObjectList,
  buildPageContext,
  buildSelectionSummary,
  type TextBoxMeasurer,
} from "@/lib/mcp/summaries";
import {
  pageNameFromPayload,
  pageSelectorFromPayload,
  resolvePageIndex,
} from "@/lib/mcp/pages";
import { pageDisplayName } from "@/lib/avnac-multi-page-document";
import {
  annotateSceneCanvas,
  canvasToPngBase64,
  cropCanvasToNodeBase64,
  cropCanvasToNodeCanvas,
  renderScenePreviewBase64,
  renderSceneToExportCanvas,
} from "@/lib/mcp/canvas-export";
import { planExport } from "@/lib/mcp/export";
import { buildPageSvg, buildSelectionSvg } from "@/lib/avnac-selection-export";
import { validateScene } from "@/lib/mcp/validate";
import { budgetFor, isOverBudget } from "@/lib/mcp/budgets";
import { MCP_IMPLEMENTED_ACTIONS } from "@/lib/mcp/actions";
import { getMCPActionHandlerId, getMCPClientId, subscribeToMCPActions } from "@/lib/mcp/transport";

type LooseRecord = Record<string, any>;

/** Router navigation subset the file tools need. */
interface MCPDeps {
  navigate?: (options: LooseRecord) => unknown;
}

// ─── response helpers ─────────────────────────────────────────────────────────

/**
 * Identifies this browser client in every MCP response. When a stale tab or a
 * second client answers an action, the mismatch is visible in the reply instead
 * of looking like a random ID failure. The id lives in transport.ts so the
 * Settings panel can compare it with the client that actually answered.
 */
const MCP_CLIENT_ID = getMCPClientId();

const SNAPSHOT_LIMIT = 20;
const SNAPSHOTS = new Map<string, SceneSnapshot>();

/** Last response emitted to the MCP bridge; dev-only observability for E2E. */
let lastMCPResponse: LooseRecord | null = null;

export function getLastMCPResponse(): LooseRecord | null {
  return lastMCPResponse;
}

function responseMeta(): LooseRecord {
  const state = useSceneEditorStore.getState();
  return {
    clientId: MCP_CLIENT_ID,
    actionHandlerId: getMCPActionHandlerId(),
    revision: state.revision,
    documentId: state.documentId,
    pageIndex: state.currentPage,
    pageCount: state.pages.length,
  };
}

function respond(requestId: string | undefined, data: LooseRecord): void {
  lastMCPResponse = { ...data, ...responseMeta() };
  if (requestId) SubmitResponse(requestId, lastMCPResponse);
}

function respondError(requestId: string | undefined, error: string): void {
  lastMCPResponse = { error, ...responseMeta() };
  if (requestId) SubmitResponse(requestId, lastMCPResponse);
}

// ─── scene access ─────────────────────────────────────────────────────────────

async function getReadyScene(timeoutMs = 4000) {
  let scene = useSceneEditorStore.getState().scene;
  if (scene) return scene;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
    scene = useSceneEditorStore.getState().scene;
    if (scene) return scene;
  }
  return null;
}

/** Wait for a scene, answering NO_SCENE_ERROR when none becomes ready. */
async function requireScene(requestId: string | undefined) {
  const scene = await getReadyScene();
  if (!scene) respondError(requestId, NO_SCENE_ERROR);
  return scene;
}

/**
 * Verify an optional document/page target before mutating. Agents can pin the
 * exact context they read in get_canvas_summary; if the editor moved, the call
 * fails instead of silently editing a different page.
 */
function assertTargetContext(
  requestId: string | undefined,
  payload: LooseRecord,
): boolean {
  const store = useSceneEditorStore.getState();
  // Let the action's requireScene path produce NO_SCENE_ERROR when no document
  // is open; a target guard should not replace it with "no pages".
  if (!store.scene || !store.documentId) return true;
  const wantedDocument = payload?.documentId;
  if (typeof wantedDocument === "string" && wantedDocument.trim()) {
    if (wantedDocument !== store.documentId) {
      respondError(
        requestId,
        "Target document " + wantedDocument + " is not active (active: " +
          (store.documentId ?? "none") + ").",
      );
      return false;
    }
  }

  const selector = pageSelectorFromPayload(payload ?? {});
  if (selector.target !== undefined) {
    const resolved = resolvePageIndex(
      store.pages.length,
      store.pageNames,
      selector.target,
      store.currentPage,
    );
    if (!resolved.ok) {
      respondError(requestId, resolved.error);
      return false;
    }
    if (resolved.index !== store.currentPage) {
      respondError(
        requestId,
        "Target page '" + resolved.name + "' is not active (active: '" +
          pageDisplayName(store.pageNames, store.currentPage) +
          "'). Switch pages first or omit the page target.",
      );
      return false;
    }
  }
  return true;
}

/** Scene + target guard for mutating/readback actions that accept a target. */
async function requireTargetScene(
  requestId: string | undefined,
  payload: LooseRecord,
) {
  const scene = await requireScene(requestId);
  if (!scene) return null;
  if (!assertTargetContext(requestId, payload ?? {})) return null;
  return scene;
}

/**
 * Resolve an object by id or by unique name. Name lookup is exact,
 * case-insensitive, and rejects ambiguity instead of picking one.
 */
function resolveNodeTarget(
  scene: NonNullable<ReturnType<typeof useSceneEditorStore.getState>["scene"]>,
  payload: LooseRecord,
):
  | { ok: true; id: string; node: any }
  | { ok: false; error: string } {
  const rawId = payload?.objectId ?? payload?.id;
  if (typeof rawId === "string" && rawId.trim()) {
    const id = rawId.trim();
    const node = scene.nodes[id];
    return node
      ? { ok: true, id, node }
      : { ok: false, error: "Object " + id + " not found" };
  }
  const rawName = payload?.name ?? payload?.targetName ?? payload?.objectName;
  if (typeof rawName !== "string" || !rawName.trim()) {
    return {
      ok: false,
      error: "objectId, id, or name is required to identify an object",
    };
  }
  const wanted = rawName.trim().toLowerCase();
  const matches = Object.values(scene.nodes).filter(
    (node) =>
      node.id !== scene.root &&
      typeof (node as LooseRecord).name === "string" &&
      String((node as LooseRecord).name).trim().toLowerCase() === wanted,
  );
  if (matches.length === 1) {
    return { ok: true, id: matches[0]!.id, node: matches[0]! };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      error:
        "Name " + JSON.stringify(rawName) + " matches " + matches.length +
        " objects; use an objectId.",
    };
  }
  return {
    ok: false,
    error: "No object named " + JSON.stringify(rawName) + ".",
  };
}

/**
 * Wait until the /scene route has finished loading a specific document.
 * create_canvas navigates and lets the route own the single initial write;
 * calling store.load() directly as well would double-write the same new
 * workspace and race on Windows (rename → Access is denied).
 */
async function waitForDocument(
  documentId: string,
  timeoutMs = 15000,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const start = Date.now();
  for (;;) {
    const state = useSceneEditorStore.getState();
    if (state.documentId === documentId && state.scene && !state.isLoading) {
      return { ok: true };
    }
    if (state.documentId === documentId && state.loadError) {
      return { ok: false, error: state.loadError };
    }
    if (Date.now() - start >= timeoutMs) {
      const current = useSceneEditorStore.getState();
      if (current.loadError) return { ok: false, error: current.loadError };
      return {
        ok: false,
        error:
          "Timed out waiting for the canvas scene to load. It may still open shortly — retry get_canvas_summary.",
      };
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

// ─── dispatcher ───────────────────────────────────────────────────────────────

export async function handleMCPAction(
  deps: MCPDeps,
  data: unknown,
): Promise<void> {
  const actionData = (Array.isArray(data) ? data[0] : data) as
    | MCPActionEnvelope
    | undefined;
  if (!actionData || !actionData.action) return;

  const { action, payload, requestId } = actionData;
  // Optional document/page guards are honored uniformly for mutations that
  // operate on the active page. Page-management ops are excluded because their
  // `page` field selects the target, not the current-page guard.
  const TARGET_GUARDED_ACTIONS = new Set([
    "render_elements",
    "modify_elements",
    "delete_object",
    "set_background",
    "apply_artboard_preset",
    "clear_canvas",
    "select_objects",
    "align_objects",
    "distribute_objects",
    "group_objects",
    "ungroup_objects",
    "fit_to_artboard",
    "export_png",
    "export_object",
    "export_svg",
    "validate_canvas",
    "vector_draw",
    "vector_update",
    "vector_delete",
    "resize_artboard",
    "create_snapshot",
    "restore_snapshot",
    "undo",
    "redo",
  ]);
  if (
    TARGET_GUARDED_ACTIONS.has(action) &&
    payload &&
    !assertTargetContext(requestId, payload as LooseRecord)
  ) {
    return;
  }
  try {
    switch (action) {
      case "create_canvas":
        return await createCanvas(deps, payload ?? {}, requestId);
      case "open_workspace":
        return await openWorkspace(deps, payload ?? {}, requestId);
      case "rename_workspace":
        return await renameWorkspace(payload ?? {}, requestId);
      case "add_page":
        return await addPageAction(payload ?? {}, requestId);
      case "goto_page":
        return await goToPageAction(payload ?? {}, requestId);
      case "rename_page":
        return await renamePageAction(payload ?? {}, requestId);
      case "delete_page":
        return await deletePageAction(payload ?? {}, requestId);
      case "resize_artboard":
        return await resizeArtboard(payload ?? {}, requestId);
      case "create_snapshot":
        return createSnapshotAction(payload ?? {}, requestId);
      case "restore_snapshot":
        return await restoreSnapshotAction(payload ?? {}, requestId);
      case "undo":
        return undoAction(requestId);
      case "redo":
        return redoAction(requestId);
      case "client_status":
        return clientStatusAction(requestId);
      case "render_elements":
        return await renderElements(payload ?? {}, requestId);
      case "modify_elements":
        return await modifyElements(payload ?? {}, requestId);
      case "get_canvas_summary":
        return await getCanvasSummary(requestId);
      case "get_canvas_state":
        return await getCanvasState(requestId);
      case "get_canvas_image":
        return await getCanvasImage(payload ?? {}, requestId);
      case "select_objects":
        return await selectObjects(payload ?? {}, requestId);
      case "delete_object":
        return await deleteObject(payload ?? {}, requestId);
      case "set_background":
        return await setBackground(payload ?? {}, requestId);
      case "apply_artboard_preset":
        return await applyArtboardPreset(payload ?? {}, requestId);
      case "get_object_properties":
        return await getObjectProperties(payload ?? {}, requestId);
      case "measure_elements":
        return await measureElements(payload ?? {}, requestId);
      case "clear_canvas":
        return await clearCanvas(requestId);
      case "list_objects":
        return await listObjects(requestId);
      case "get_selection":
        return await getSelection(requestId);
      case "align_objects":
        return await alignObjects(payload ?? {}, requestId);
      case "distribute_objects":
        return await distributeObjects(payload ?? {}, requestId);
      case "group_objects":
        return await groupObjects(payload ?? {}, requestId);
      case "ungroup_objects":
        return await ungroupObjects(payload ?? {}, requestId);
      case "fit_to_artboard":
        return await fitToArtboard(payload ?? {}, requestId);
      case "export_png":
      case "export_object":
        return await exportImage(payload ?? {}, requestId);
      case "export_svg":
        return await exportSvg(payload ?? {}, requestId);
      case "validate_canvas":
        return await validateCanvas(payload ?? {}, requestId);
      case "get_font_list":
        return await getFontList(payload ?? {}, requestId);
      case "vector_draw":
        return await vectorDraw(payload ?? {}, requestId);
      case "vector_update":
        return await vectorUpdate(payload ?? {}, requestId);
      case "vector_delete":
        return await vectorDelete(payload ?? {}, requestId);
      default:
        respondError(requestId, `Unknown action '${action}'`);
    }
  } catch (e: any) {
    console.error("Failed to handle MCP action:", e);
    try {
      if (actionData.requestId) {
        respondError(
          actionData.requestId,
          e?.message || "Internal error handling MCP action",
        );
      }
    } catch {}
  }
}

// ─── file management (no canvas required) ─────────────────────────────────────

async function createCanvas(
  deps: MCPDeps,
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const { width, height, backgroundColor, color, name } = payload;
  const previousDocumentId = useSceneEditorStore.getState().documentId;
  const newId = crypto.randomUUID();
  const w = width || 1080;
  const h = height || 1080;
  const bg = backgroundColor || color;
  const title = typeof name === "string" ? name.trim() : "";
  try {
    if (deps.navigate) {
      // Single-writer path: navigate with name so the /scene route's
      // single load+write creates the row atomically with the title.
      // (Calling store.load() here as well would write the same new
      // workspace twice concurrently.)
      void deps.navigate({
        to: "/scene",
        search: { id: newId, w, h, name: title || undefined },
      });
      const ready = await waitForDocument(newId);
      if (!ready.ok) {
        respondError(requestId, `Failed to load: ${ready.error}`);
        return;
      }
      // Belt-and-suspenders: if the route loaded without the name
      // (e.g. older route cached), apply it now.
      let done = useSceneEditorStore.getState();
      if (title && done.documentName !== title) {
        done.setDocumentName(title);
        await useSceneEditorStore.getState().commitDocumentName();
        done = useSceneEditorStore.getState();
      }
      if (bg) {
        done.applyCommands([{ type: "SET_ARTBOARD", bg: parseColor(bg) }]);
      }
      if (requestId) {
        done = useSceneEditorStore.getState();
        const persistedName = done.documentName || "Untitled";
        respond(requestId, {
          success: !title || persistedName === title,
          id: newId,
          name: persistedName,
          width: done.scene?.artboard.width ?? w,
          height: done.scene?.artboard.height ?? h,
          message: title
            ? "Canvas '" + persistedName + "' created and navigated to /scene"
            : "Canvas created and navigated to /scene",
          ...(previousDocumentId
            ? {
                notice:
                  "A canvas was already open. For a draft, test or variation, use canvas op=add-page inside that canvas instead of creating a new one.",
              }
            : {}),
        });
      }
    } else {
      // Fallback when no router is wired (tests): direct single load.
      const store = useSceneEditorStore.getState();
      await store.load(newId, { w, h, name: title || undefined });
      let fresh = useSceneEditorStore.getState();
      if (title && fresh.documentName !== title) {
        fresh.setDocumentName(title);
        await useSceneEditorStore.getState().commitDocumentName();
        fresh = useSceneEditorStore.getState();
      }
      if (bg) {
        fresh.applyCommands([{ type: "SET_ARTBOARD", bg: parseColor(bg) }]);
      }
      if (requestId) {
        const done = useSceneEditorStore.getState();
        const persistedName = done.documentName || "Untitled";
        respond(requestId, {
          success: !title || persistedName === title,
          id: newId,
          name: persistedName,
          width: done.scene?.artboard.width ?? w,
          height: done.scene?.artboard.height ?? h,
          message: "Canvas created",
          ...(previousDocumentId
            ? {
                notice:
                  "A canvas was already open. For a draft, test or variation, use canvas op=add-page inside that canvas instead of creating a new one.",
              }
            : {}),
        });
      }
    }
  } catch (err: any) {
    respondError(requestId, err?.message || String(err));
  }
}

async function openWorkspace(
  deps: MCPDeps,
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const fileId = typeof payload?.fileId === "string" ? payload.fileId.trim() : "";
  if (!fileId) {
    respondError(requestId, "fileId is required (from files op=list)");
    return;
  }
  try {
    const record = await idbGetEditorRecord(fileId);
    if (!record) {
      respondError(
        requestId,
        `No saved file with id '${fileId}'. Call files op=list to see available canvases.`,
      );
      return;
    }
    // Already active and loaded? Report without re-navigating.
    const current = useSceneEditorStore.getState();
    if (current.documentId === fileId && current.scene && !current.isLoading) {
      respond(requestId, {
        success: true,
        id: fileId,
        name: current.documentName || "Untitled",
        width: current.scene.artboard.width,
        height: current.scene.artboard.height,
        nodeCount: Object.keys(current.scene.nodes).length,
        message: `Canvas '${current.documentName || "Untitled"}' is already open`,
      });
      return;
    }
    if (deps.navigate) {
      // Navigate and let the /scene route own the load, mirroring the
      // create_canvas single-writer contract.
      void deps.navigate({ to: "/scene", search: { id: fileId } });
      const ready = await waitForDocument(fileId);
      if (!ready.ok) {
        respondError(requestId, `Failed to open canvas: ${ready.error}`);
        return;
      }
    } else {
      // Fallback when no router is wired (tests): direct load.
      await current.load(fileId);
    }    const done = useSceneEditorStore.getState();
    respond(requestId, {
      success: true,
      id: fileId,
      name: done.documentName || "Untitled",
      width: done.scene?.artboard.width ?? record.document?.artboard?.width ?? 0,
      height:
        done.scene?.artboard.height ?? record.document?.artboard?.height ?? 0,
      nodeCount: done.scene ? Object.keys(done.scene.nodes).length : 0,
      message: `Canvas '${done.documentName || "Untitled"}' opened`,
    });
  } catch (err: any) {
    respondError(requestId, err?.message || String(err));
  }
}

async function renameWorkspace(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const fileId = typeof payload?.fileId === "string" ? payload.fileId.trim() : "";
  const newName = typeof payload?.name === "string" ? payload.name.trim() : "";
  if (!fileId || !newName) {
    respondError(requestId, "fileId and name are required");
    return;
  }
  try {
    const active = useSceneEditorStore.getState();
    if (active.documentId === fileId) {
      // Canonical path: the store persists the name with the live doc.
      active.setDocumentName(newName);
      await useSceneEditorStore.getState().commitDocumentName();
    } else {
      await idbSetDocumentName(fileId, newName);
    }
    respond(requestId, {
      success: true,
      id: fileId,
      name: newName,
      message: `File renamed to '${newName}'`,
    });
  } catch (err: any) {
    respondError(requestId, err?.message || String(err));
  }
}

// ─── pages (drafts, tests and variations inside the open project) ─────────────

const PAGE_SCENE_ERROR =
  "No active canvas scene. Open a project first (canvas op=create for a new one, " +
  "or files op=list then files op=open), then use canvas op=add-page inside it.";

function currentPageResponse(
  requestId: string | undefined,
  extra: LooseRecord = {},
): void {
  const store = useSceneEditorStore.getState();
  const context = buildPageContext(
    store.pages,
    store.pageNames,
    store.currentPage,
  );
  respond(requestId, {
    success: true,
    documentId: store.documentId,
    documentName: store.documentName,
    page: context.page,
    pageCount: context.pageCount,
    ...extra,
  });
}

function readArtboardDimension(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 100 || n > 16000) return null;
  return Math.round(n);
}

async function addPageAction(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const store = useSceneEditorStore.getState();
  if (!store.documentId || !store.scene) {
    respondError(requestId, PAGE_SCENE_ERROR);
    return;
  }
  if (!assertTargetContext(requestId, payload ?? {})) return;
  const width = readArtboardDimension(payload.width);
  const height = readArtboardDimension(payload.height);
  if (width === null || height === null) {
    respondError(requestId, "Page width and height must be between 100 and 16000 pixels.");
    return;
  }
  const backgroundColor =
    typeof payload.backgroundColor === "string"
      ? payload.backgroundColor
      : typeof payload.color === "string"
        ? payload.color
        : undefined;
  const name = pageNameFromPayload(payload.name ?? payload.pageName);
  try {
    await store.addPage(name, { width, height, backgroundColor });
    const next = useSceneEditorStore.getState();
    const context = buildPageContext(next.pages, next.pageNames, next.currentPage);
    currentPageResponse(requestId, {
      message: `Added page '${context.page?.name ?? name}' and switched the editor to it.`,
    });
  } catch (err: any) {
    respondError(requestId, err?.message || String(err));
  }
}

async function goToPageAction(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const store = useSceneEditorStore.getState();
  if (!store.documentId || !store.scene) {
    respondError(requestId, PAGE_SCENE_ERROR);
    return;
  }
  const selector = pageSelectorFromPayload(payload);
  if (selector.target === undefined) {
    respondError(
      requestId,
      "page is required: a 1-based page number, a page name, or a 0-based index (from get_canvas_summary).",
    );
    return;
  }
  const target = resolvePageIndex(
    store.pages.length,
    store.pageNames,
    selector.target,
    store.currentPage,
  );
  if (!target.ok) {
    respondError(requestId, target.error);
    return;
  }
  try {
    await store.goToPage(target.index);
    currentPageResponse(requestId, {
      message: `Switched the editor to page '${target.name}'.`,
    });
  } catch (err: any) {
    respondError(requestId, err?.message || String(err));
  }
}

async function renamePageAction(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const store = useSceneEditorStore.getState();
  if (!store.documentId || !store.scene) {
    respondError(requestId, PAGE_SCENE_ERROR);
    return;
  }
  const name = pageNameFromPayload(payload.name ?? payload.pageName);
  if (!name) {
    respondError(requestId, "name is required (a non-empty page name)");
    return;
  }
  const selector = pageSelectorFromPayload(payload);
  const target = resolvePageIndex(
    store.pages.length,
    store.pageNames,
    selector.target,
    store.currentPage,
  );
  if (!target.ok) {
    respondError(requestId, target.error);
    return;
  }
  try {
    await store.renamePage(target.index, name);
    currentPageResponse(requestId, {
      message: `Renamed page ${target.index + 1} to '${name}'.`,
    });
  } catch (err: any) {
    respondError(requestId, err?.message || String(err));
  }
}

async function deletePageAction(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const store = useSceneEditorStore.getState();
  if (!store.documentId || !store.scene) {
    respondError(requestId, PAGE_SCENE_ERROR);
    return;
  }
  if (store.pages.length <= 1) {
    respondError(
      requestId,
      "Cannot delete the only page in the document. Clear it with canvas op=clear, or create another page first.",
    );
    return;
  }
  const selector = pageSelectorFromPayload(payload);
  const target = resolvePageIndex(
    store.pages.length,
    store.pageNames,
    selector.target,
    store.currentPage,
  );
  if (!target.ok) {
    respondError(requestId, target.error);
    return;
  }
  const deletedName = pageDisplayName(store.pageNames, target.index);
  try {
    const removed = await store.deletePageAt(target.index);
    if (!removed) {
      respondError(
        requestId,
        "Cannot delete the page (it may be the last page or the document is not loaded).",
      );
      return;
    }
    currentPageResponse(requestId, {
      deleted: {
        index: target.index,
        number: target.index + 1,
        name: deletedName,
      },
      message: `Deleted page '${deletedName}'.`,
    });
  } catch (err: any) {
    respondError(requestId, err?.message || String(err));
  }
}

// ─── artboard lifecycle, snapshots and diagnostics ───────────────────────────

async function resizeArtboard(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload ?? {});
  if (!scene) return;

  const width = readArtboardDimension(payload.width);
  const height = readArtboardDimension(payload.height);
  if (width === null || height === null) {
    respondError(requestId, "Artboard width and height must be between 100 and 16000 pixels.");
    return;
  }
  const background =
    typeof payload.backgroundColor === "string"
      ? payload.backgroundColor
      : typeof payload.color === "string"
        ? payload.color
        : undefined;
  if (width === undefined && height === undefined && !background) {
    respondError(requestId, "resize needs width, height, or backgroundColor.");
    return;
  }

  const store = useSceneEditorStore.getState();
  store.setArtboard(
    width,
    height,
    background ? parseColor(background) : undefined,
  );
  const next = useSceneEditorStore.getState().scene;
  respond(requestId, {
    success: true,
    width: next?.artboard.width ?? width ?? scene.artboard.width,
    height: next?.artboard.height ?? height ?? scene.artboard.height,
    background: next?.artboard.bg ?? scene.artboard.bg,
    message: "Artboard resized.",
  });
}

function createSnapshotAction(
  payload: MCPPayload,
  requestId: string | undefined,
): void {
  const store = useSceneEditorStore.getState();
  if (!store.documentId || !store.scene) {
    respondError(requestId, PAGE_SCENE_ERROR);
    return;
  }
  if (!assertTargetContext(requestId, payload ?? {})) return;
  const snapshot = store.captureSnapshot();
  if (!snapshot) {
    respondError(requestId, "Could not capture the current document.");
    return;
  }
  const token =
    typeof payload.token === "string" && payload.token.trim()
      ? payload.token.trim()
      : "snap-" + crypto.randomUUID();
  SNAPSHOTS.set(token, snapshot);
  while (SNAPSHOTS.size > SNAPSHOT_LIMIT) {
    const oldest = SNAPSHOTS.keys().next().value;
    if (oldest === undefined) break;
    SNAPSHOTS.delete(oldest);
  }
  respond(requestId, {
    success: true,
    token,
    pageCount: snapshot.pages.length,
    currentPage: snapshot.currentPage,
    nodeCount: snapshot.pages[snapshot.currentPage]
      ? (snapshot.pages[snapshot.currentPage] as any).fabric?.objects?.length ?? 0
      : 0,
    snapshotRevision: snapshot.revision,
    message: "Snapshot captured. Restore it with canvas op=restore.",
  });
}

async function restoreSnapshotAction(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const token = String(payload.token ?? payload.snapshotId ?? "").trim();
  if (!token) {
    respondError(requestId, "snapshot token is required (from canvas op=snapshot).");
    return;
  }
  const snapshot = SNAPSHOTS.get(token);
  if (!snapshot) {
    respondError(
      requestId,
      "No snapshot named " + JSON.stringify(token) +
        ". Snapshots are session-scoped; capture a new one with canvas op=snapshot.",
    );
    return;
  }
  const store = useSceneEditorStore.getState();
  if (!assertTargetContext(requestId, payload ?? {})) return;
  const restored = await store.restoreSnapshot(snapshot);
  if (!restored) {
    respondError(requestId, "Could not restore the snapshot.");
    return;
  }
  const next = useSceneEditorStore.getState();
  respond(requestId, {
    success: true,
    token,
    pageCount: next.pages.length,
    restoredRevision: snapshot.revision,
    message: "Snapshot restored.",
  });
}

function undoAction(requestId: string | undefined): void {
  const store = useSceneEditorStore.getState();
  store.undo();
  const next = useSceneEditorStore.getState();
  respond(requestId, {
    success: true,
    canUndo: next.canUndo,
    canRedo: next.canRedo,
    message: "Undo applied.",
  });
}

function redoAction(requestId: string | undefined): void {
  const store = useSceneEditorStore.getState();
  store.redo();
  const next = useSceneEditorStore.getState();
  respond(requestId, {
    success: true,
    canUndo: next.canUndo,
    canRedo: next.canRedo,
    message: "Redo applied.",
  });
}

function clientStatusAction(requestId: string | undefined): void {
  const store = useSceneEditorStore.getState();
  const context = buildPageContext(store.pages, store.pageNames, store.currentPage);
  respond(requestId, {
    success: true,
    clientId: MCP_CLIENT_ID,
    actionHandlerId: getMCPActionHandlerId(),
    revision: store.revision,
    // The action table Settings checks this window against.
    actions: MCP_IMPLEMENTED_ACTIONS,
    document: {
      id: store.documentId,
      name: store.documentName,
      pageCount: context.pageCount,
    },
    page: context.page,
    canUndo: store.canUndo,
    canRedo: store.canRedo,
    capabilities: [
      "canvas.add-page",
      "canvas.go-page",
      "canvas.rename-page",
      "canvas.delete-page",
      "canvas.resize",
      "canvas.snapshot",
      "canvas.restore",
      "canvas.undo",
      "canvas.redo",
      "canvas.status",
      "elements.render",
      "elements.modify",
      "elements.measure",
      "export.png",
      "export.object",
      "export.svg",
      "vector.draw",
      "vector.update",
      "vector.read",
      "vector.export",
      "vector.delete",
      "vector.list",
      "vector.status",
      "vector.recover",
      "validate",
      "fonts.loaded",
    ],
  });
}

// ─── element creation / modification ──────────────────────────────────────────

/**
 * How long render_elements waits for Google Fonts before measuring with
 * whatever is loaded. Measuring against a fallback face is slightly off;
 * blocking the tool on a slow or offline font CDN is worse.
 */
const MCP_FONT_WAIT_MS = 1500;

function collectElementFontFamilies(elements: unknown[]): string[] {
  const families = new Set<string>();
  for (const raw of elements) {
    const el = (raw ?? {}) as LooseRecord;
    if (el.type === "text") families.add(String(el.fontFamily ?? "Inter"));
  }
  return [...families];
}

/**
 * Real text measurement for render_elements, injected into the pure builder.
 *
 * The builder cannot measure for itself: layoutTextLines needs a Canvas, and
 * lib/saraswati deliberately stays renderer-free. This layer may import
 * renderer code and is already async, so it waits for fonts and measures here.
 * Returns null when no canvas measurement is available (jsdom, headless), and
 * the builder falls back to its estimate.
 */
function measureTextElement(
  input: TextMeasureRequest,
): { width: number; height: number } | null {
  if (!getSharedTextMeasure()) return null;
  // With no caller width, wrap at 1px so wrapping is skipped entirely and the
  // resulting box is the text's natural width.
  const natural = input.width == null;
  const layout = layoutTextLines({ ...input, width: input.width ?? 1 });
  // Round up so a stored width can never re-wrap the text a pixel tighter than
  // it was measured, and so agents get integral numbers to lay out against.
  return {
    width: Math.ceil(natural ? layout.boxWidth : input.width!),
    height: Math.ceil(layout.boxHeight),
  };
}

async function renderElements(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload);
  if (!scene) return;

  const { elements, includePreview } = payload;
  if (!elements || !Array.isArray(elements)) {
    respondError(requestId, "elements must be an array");
    return;
  }

  // Measure against the real font where possible — text boxes depend on glyph
  // widths, and a fallback face changes how many lines the text wraps into.
  await Promise.race([
    ensureGoogleFontsForFamilies(collectElementFontFamilies(elements)),
    new Promise((resolve) => setTimeout(resolve, MCP_FONT_WAIT_MS)),
  ]);

  // Only fit=cover or an explicit crop needs the source dimensions. A plain
  // image (the common case) must not wait on a CDN fetch just to be placed.
  const imageUrls = (elements as LooseRecord[])
    .filter(
      (el) =>
        el?.type === "image" &&
        typeof el.url === "string" &&
        imageNeedsNaturalSize(el),
    )
    .map((el) => el.url as string);
  const imageSizes = imageUrls.length > 0 ? await loadImageSizes(imageUrls) : undefined;

  const { commands, created, skipped } = buildRenderElementsCommands(
    scene,
    elements,
    measureTextElement,
    imageSizes,
  );
  if (commands.length > 0) {
    useSceneEditorStore.getState().applyCommands(commands);
  }

  // A batch that produced nothing is a failure, not a success with an empty
  // list: silently accepting an unsupported type teaches the caller nothing.
  if (created.length === 0 && skipped.length > 0) {
    const detail = skipped
      .map((s) => `#${s.index} "${s.type}"`)
      .join(", ");
    respondError(
      requestId,
      `No elements were created (${detail}). ${skipped[0].reason}`,
    );
    return;
  }

  if (includePreview) {
    try {
      const updatedScene = useSceneEditorStore.getState().scene;
      if (updatedScene) {
        const imageData = await renderScenePreviewBase64(updatedScene);
        respond(requestId, { success: true, created, skipped, imageData });
        return;
      }
    } catch (err) {
      console.warn("Failed to generate preview for render_elements:", err);
    }
  }
  respond(requestId, { success: true, created, skipped });
}

async function modifyElements(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload);
  if (!scene) return;

  const { modifications, includePreview } = payload;
  if (!modifications || !Array.isArray(modifications)) {
    respondError(requestId, "modifications must be an array");
    return;
  }
  if (modifications.length === 0) {
    respondError(requestId, "modifications is empty");
    return;
  }

  // Art-direction modifications and source replacement need natural image
  // dimensions to recompute the crop; everything else modifies without I/O.
  const urlSet = new Set<string>();
  for (const raw of modifications as LooseRecord[]) {
    if (typeof raw?.url === "string" && raw.url.trim()) urlSet.add(raw.url.trim());
    if (typeof raw?.src === "string" && raw.src.trim()) urlSet.add(raw.src.trim());
    const id = raw?.objectId ?? raw?.id;
    const node = typeof id === "string" ? scene.nodes[id] : null;
    if (
      node?.type === "image" &&
      (raw.fit !== undefined || raw.focalPoint !== undefined || raw.crop !== undefined)
    ) {
      const src = (node as LooseRecord).src;
      if (typeof src === "string" && src.length > 0) urlSet.add(src);
    }
  }
  const urls = [...urlSet];
  const imageSizes = urls.length > 0 ? await loadImageSizes(urls) : undefined;

  const { commands, modifiedCount, resolved, issues } =
    buildModifyElementsCommands(scene, modifications, imageSizes);

  if (commands.length > 0) {
    useSceneEditorStore.getState().applyCommands(commands);
  }

  const afterScene = useSceneEditorStore.getState().scene;
  const modified = resolved.map((entry) => {
    const afterNode = afterScene?.nodes[entry.objectId];
    return {
      ...entry,
      after: afterNode ? snapshotNode(afterNode) : null,
    };
  });

  if (modifiedCount === 0) {
    const detail = issues
      .map((issue) => "#" + issue.index + " " + issue.requested + ": " + issue.reason)
      .join("; ");
    respondError(
      requestId,
      "No elements were modified. " + (detail || "No changes were produced."),
    );
    return;
  }

  const result: LooseRecord = {
    success: true,
    modifiedCount,
    modified,
    issues,
  };
  if (includePreview) {
    try {
      if (afterScene) {
        result.imageData = await renderScenePreviewBase64(afterScene);
      }
    } catch (err) {
      console.warn("Failed to generate preview for modify_elements:", err);
    }
  }
  respond(requestId, result);
}

// ─── scene queries ────────────────────────────────────────────────────────────

/**
 * Real text bounds for get_canvas_summary.
 *
 * Text nodes store no height, and the pure estimator in spatial/index.ts guesses
 * from a 0.5em average, which over-reports line count for text whose box is its
 * own measured width (the shape MCP's render_elements creates). Measuring here
 * keeps the summary consistent with the renderer and with the bounds
 * render_elements returned.
 */
const measureSummaryText: TextBoxMeasurer = (node) => {
  if (!getSharedTextMeasure()) return null;
  const layout = layoutTextLines({
    text: node.text,
    fontSize: node.fontSize,
    fontFamily: node.fontFamily,
    fontWeight: node.fontWeight,
    fontStyle: node.fontStyle === "italic" ? "italic" : "normal",
    lineHeight: node.lineHeight,
    width: node.width,
  });
  return { width: Math.ceil(layout.boxWidth), height: Math.ceil(layout.boxHeight) };
};

/**
 * Ink-level text metrics for a node, in canvas coordinates.
 *
 * The renderer draws with textBaseline "top" at the node's y, so the alphabetic
 * baseline is y + ascent and the capital-letter band is [baseline - capHeight,
 * baseline]. Exposing this is what lets a dot or icon align to the letters
 * instead of to the text's rectangular box.
 */
type TextInkMetrics = {
  ascent: number;
  descent: number;
  capHeight: number;
  baseline: number;
  capTop: number;
  capCenterY: number;
};

function textInkMetrics(node: LooseRecord): TextInkMetrics | null {
  if (!node || node.type !== "text") return null;
  const measured = measureTextVerticalMetrics({
    fontSize: Number(node.fontSize),
    fontFamily: String(node.fontFamily ?? ""),
    fontWeight: String(node.fontWeight ?? "400"),
    fontStyle: node.fontStyle === "italic" ? "italic" : "normal",
  });
  if (!measured) return null;
  const baseline = Number(node.y) + measured.ascent;
  const capTop = baseline - measured.capHeight;
  return {
    ...measured,
    baseline,
    capTop,
    capCenterY: capTop + measured.capHeight / 2,
  };
}

async function getCanvasSummary(requestId: string | undefined): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const store = useSceneEditorStore.getState();
  respond(requestId, {
    ...buildCanvasSummary(scene, measureSummaryText),
    document: {
      id: store.documentId,
      name: store.documentName,
    },
    ...buildPageContext(
      store.pages,
      store.pageNames,
      store.currentPage,
      Math.max(0, Object.keys(scene.nodes).length - 1),
    ),
  });
}

async function getCanvasState(requestId: string | undefined): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  respond(requestId, { scene });
}

async function getCanvasImage(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;

  try {
    const canvas = await renderSceneToExportCanvas(scene, {
      maxCssPx: 1024,
      prePaint: true,
    });
    if (!canvas) {
      respondError(requestId, "Failed to render scene to canvas");
      return;
    }

    if (payload?.annotated) {
      annotateSceneCanvas(canvas, scene);
    }

    if (payload?.objectId) {
      if (!scene.nodes[payload.objectId]) {
        respondError(
          requestId,
          `Object ${payload.objectId} not found in scene`,
        );
        return;
      }
      // Null means the 2D context was unavailable — fall through to the
      // full-canvas image, matching the original listener behavior.
      const cropped = cropCanvasToNodeBase64(canvas, scene, payload.objectId);
      if (cropped) {
        respond(requestId, { imageData: cropped });
        return;
      }
    }

    respond(requestId, { imageData: canvasToPngBase64(canvas) });
  } catch (err: any) {
    respondError(requestId, err?.message || "Failed to export image");
  }
}

async function getObjectProperties(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload ?? {});
  if (!scene) return;
  const target = resolveNodeTarget(scene, payload ?? {});
  if (!target.ok) {
    respondError(requestId, target.error);
    return;
  }
  const node = target.node;
  if (node.type === "image") {
    const cached = getCachedImageSize(node.src);
    const naturalSize = cached !== undefined ? cached : await loadImageSize(node.src);
    respond(requestId, naturalSize ? { id: target.id, node, naturalSize } : { id: target.id, node });
    return;
  }
  const metrics = textInkMetrics(node as LooseRecord);
  respond(requestId, metrics ? { id: target.id, node, metrics } : { id: target.id, node });
}

async function listObjects(requestId: string | undefined): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  respond(requestId, { objects: buildObjectList(scene) });
}

/**
 * Measure proposed elements without drawing them.
 *
 * This is the pre-render half of composition: an agent can ask "how big will
 * this headline be, and will it wrap?" and then place it correctly first time.
 * Text uses the same layout + vertical metrics as rendering, so the numbers are
 * the ones the canvas will use. Image dimensions come from the decoded source.
 */
async function measureElements(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const elements = payload?.elements;
  if (!Array.isArray(elements)) {
    respondError(requestId, "elements must be an array");
    return;
  }

  const results = await Promise.all(
    elements.map(async (raw, index) => {
      const el = (raw ?? {}) as LooseRecord;
      if (el.type === "text") {
        const text = typeof el.text === "string" ? el.text : "";
        if (!text.trim()) return { index, type: "text", error: "text is empty" };
        const requestedWidth = Number(el.width);
        const naturalWidth = !(Number.isFinite(requestedWidth) && requestedWidth > 0);
        const width = naturalWidth ? 1 : requestedWidth;
        const fontSize = Number(el.fontSize) || 16;
        const fontFamily = String(el.fontFamily ?? "Inter");
        const fontWeight = String(el.fontWeight ?? "400");
        const fontStyle = el.fontStyle === "italic" ? "italic" : "normal";
        const lineHeight = Number(el.lineHeight) || 1.2;

        const layout = layoutTextLines({
          text,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          lineHeight,
          width,
        });
        const metrics = measureTextVerticalMetrics({
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
        });
        const boxWidth = Math.ceil(naturalWidth ? layout.boxWidth : requestedWidth);
        const boxHeight = Math.ceil(layout.boxHeight);
        const x = Number(el.x ?? el.left);
        const y = Number(el.y ?? el.top);
        const hasOrigin = Number.isFinite(x) && Number.isFinite(y);
        const capTopOffset = metrics ? metrics.ascent - metrics.capHeight : null;
        const capCenterOffset =
          metrics && capTopOffset !== null ? capTopOffset + metrics.capHeight / 2 : null;

        return {
          index,
          type: "text",
          text,
          naturalWidth,
          width: boxWidth,
          height: boxHeight,
          lineCount: layout.lines.length,
          lines: layout.lines,
          capHeight: metrics ? Math.round(metrics.capHeight * 100) / 100 : null,
          ascent: metrics ? Math.round(metrics.ascent * 100) / 100 : null,
          capTopOffset,
          capCenterOffset,
          ...(hasOrigin && metrics
            ? {
                baseline: Math.round((y + metrics.ascent) * 100) / 100,
                capTop: Math.round((y + (capTopOffset ?? 0)) * 100) / 100,
                capCenterY: Math.round((y + (capCenterOffset ?? 0)) * 100) / 100,
              }
            : {}),
        };
      }

      if (el.type === "image" && typeof el.url === "string") {
        const size = await loadImageSize(el.url);
        const width = Number(el.width);
        const height = Number(el.height);
        return {
          index,
          type: "image",
          width: Number.isFinite(width) && width > 0 ? width : size?.width ?? 100,
          height: Number.isFinite(height) && height > 0 ? height : size?.height ?? 100,
          naturalWidth: size?.width ?? null,
          naturalHeight: size?.height ?? null,
        };
      }

      const width = Number(el.width);
      const height = Number(el.height);
      return {
        index,
        type: typeof el.type === "string" ? el.type : "unknown",
        width: Number.isFinite(width) && width > 0 ? width : 100,
        height: Number.isFinite(height) && height > 0 ? height : 100,
      };
    }),
  );

  respond(requestId, { elements: results });
}

async function getSelection(requestId: string | undefined): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const selectedIds = useSceneEditorStore.getState().selectedIds ?? [];
  respond(requestId, buildSelectionSummary(scene, selectedIds));
}

async function getFontList(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const raw =
    payload.families ?? payload.fontFamilies ?? payload.check ?? payload.family;
  const requested = Array.isArray(raw)
    ? raw.map((value) => String(value).trim()).filter(Boolean)
    : typeof raw === "string"
      ? raw.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
  const loaded: Record<string, boolean> = {};
  if (typeof document !== "undefined" && document.fonts) {
    for (const family of requested) {
      try {
        loaded[family] = document.fonts.check('16px "' + family.replace(/"/g, "") + '"');
      } catch {
        loaded[family] = false;
      }
    }
  }
  respond(requestId, {
    fonts: GOOGLE_FONT_FAMILIES,
    requested,
    loaded,
    ...(requested.length > 0
      ? {
          allLoaded: requested.every((family) => loaded[family] === true),
        }
      : {}),
  });
}
// ─── selection / layout ───────────────────────────────────────────────────────

async function selectObjects(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const ids = payload?.objectIds;
  const list = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
  const valid = list.filter(
    (id: unknown) =>
      typeof id === "string" &&
      (scene.nodes as LooseRecord)[id as string],
  );
  if (valid.length === 0) {
    respondError(
      requestId,
      `No matching objects for ids: ${JSON.stringify(list)}`,
    );
    return;
  }
  useSceneEditorStore.getState().setSelectedIds(valid);
  respond(requestId, { success: true, selectedIds: valid });
}

async function deleteObject(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload ?? {});
  if (!scene) return;
  const store = useSceneEditorStore.getState();
  const hasTarget =
    payload?.objectId ?? payload?.id ?? payload?.name ?? payload?.targetName;
  if (hasTarget !== undefined) {
    const target = resolveNodeTarget(scene, payload ?? {});
    if (!target.ok) {
      respondError(requestId, target.error);
      return;
    }
    store.applyCommands([{ type: "DELETE_NODE", id: target.id }]);
    const next = useSceneEditorStore.getState();
    next.setSelectedIds(next.selectedIds.filter((id) => id !== target.id));
    respond(requestId, { success: true, deletedId: target.id });
    return;
  }
  const selected = store.selectedIds ?? [];
  if (selected.length === 0) {
    respondError(
      requestId,
      "No objectId/name provided and no current selection to delete",
    );
    return;
  }
  store.applyCommands(
    selected.map((id) => ({ type: "DELETE_NODE" as const, id })),
  );
  store.setSelectedIds([]);
  respond(requestId, { success: true, deletedIds: selected });
}

async function setBackground(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const color = payload?.color ?? payload?.backgroundColor;
  if (!color) {
    respondError(requestId, "color is required (hex e.g. '#0f172a')");
    return;
  }
  useSceneEditorStore
    .getState()
    .setArtboard(undefined, undefined, parseColor(color));
  const updated = useSceneEditorStore.getState().scene;
  respond(requestId, {
    success: true,
    background: updated?.artboard.bg ?? parseColor(color),
  });
}

async function applyArtboardPreset(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const presetId = payload?.presetId ?? payload?.preset;
  const preset = ARTBOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    respondError(
      requestId,
      `Unknown preset ${JSON.stringify(presetId)}. Valid presetId: ${ARTBOARD_PRESETS.map((p) => p.id).join(", ")}`,
    );
    return;
  }
  useSceneEditorStore.getState().setArtboard(preset.width, preset.height);
  respond(requestId, {
    success: true,
    presetId: preset.id,
    width: preset.width,
    height: preset.height,
  });
}

async function clearCanvas(requestId: string | undefined): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const store = useSceneEditorStore.getState();
  const commands = buildClearCanvasCommands(scene);
  store.applyCommands(commands);
  store.setSelectedIds([]);
  respond(requestId, { success: true, clearedCount: commands.length });
}

// ─── align / distribute / group / fit ─────────────────────────────────────────

async function alignObjects(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const kind = normalizeAlignKind(
    payload?.type ?? payload?.kind ?? payload?.align,
  );
  if (!ALIGN_KINDS.includes(kind)) {
    respondError(
      requestId,
      `Unknown align type ${JSON.stringify(payload?.type)}. Expected one of left, center, right, top, middle, bottom, cap-middle.`,
    );
    return;
  }
  const store = useSceneEditorStore.getState();
  const selected = (store.selectedIds ?? []).filter((id) => scene.nodes[id]);
  if (selected.length === 0) {
    respondError(
      requestId,
      "No selected objects to align. Call arrange op=select first.",
    );
    return;
  }

  // cap-middle targets the ink band of the first selected text object: the
  // letters, not the line box. Without real metrics there is nothing honest to
  // align to, so say so instead of silently falling back to box centring.
  const anchor = selected
    .map((id) => scene.nodes[id])
    .find((node) => node?.type === "text");
  const anchorMetrics = anchor ? textInkMetrics(anchor as LooseRecord) : null;
  if (kind === "cap-middle" && (!anchor || !anchorMetrics)) {
    respondError(
      requestId,
      "cap-middle needs at least one text object in the selection, and text metrics are unavailable in this environment.",
    );
    return;
  }

  const { commands, alignedCount } = buildAlignCommands(scene, selected, kind, {
    anchorId: anchor?.id,
    capCenterY: anchorMetrics?.capCenterY,
  });
  if (alignedCount === 0) {
    respondError(requestId, "Selected objects have no measurable bounds");
    return;
  }
  if (commands.length > 0) store.applyCommands(commands);
  respond(requestId, {
    success: true,
    alignedCount,
    kind,
    movedCount: commands.length,
  });
}

async function distributeObjects(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const direction = String(
    payload?.direction ?? payload?.type ?? "horizontal",
  ).toLowerCase();
  if (direction !== "horizontal" && direction !== "vertical") {
    respondError(
      requestId,
      `direction must be 'horizontal' or 'vertical' (got ${JSON.stringify(payload?.direction ?? payload?.type)})`,
    );
    return;
  }
  const store = useSceneEditorStore.getState();
  const selected = (store.selectedIds ?? []).filter((id) => scene.nodes[id]);
  if (selected.length < 3) {
    respondError(
      requestId,
      `arrange op=distribute needs at least 3 selected objects (got ${selected.length}). Call arrange op=select first.`,
    );
    return;
  }
  const { commands } = buildDistributeCommands(scene, selected, direction);
  if (commands.length > 0) store.applyCommands(commands);
  respond(requestId, {
    success: true,
    direction,
    distributedCount: selected.length,
    movedCount: commands.length,
  });
}

async function groupObjects(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const store = useSceneEditorStore.getState();
  const ids = Array.isArray(payload?.objectIds) ? payload.objectIds : [];
  if (ids.length < 2) {
    respondError(
      requestId,
      "objectIds must contain at least 2 ids to group",
    );
    return;
  }
  const nodes = ids.map((id: string) => scene.nodes[id]);
  if (nodes.some((n: unknown) => !n)) {
    respondError(requestId, "One or more objectIds not found in scene");
    return;
  }
  const parentId = (nodes[0] as LooseRecord).parentId;
  if (
    !parentId ||
    nodes.some((n: unknown) => (n as LooseRecord).parentId !== parentId)
  ) {
    respondError(requestId, "All grouped objects must share the same parent");
    return;
  }
  const groupId = crypto.randomUUID();
  store.applyCommands([
    { type: "GROUP_NODES", id: groupId, parentId, children: [...ids] },
  ]);
  store.setSelectedIds([groupId]);
  respond(requestId, { success: true, groupId, children: ids });
}

async function ungroupObjects(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const store = useSceneEditorStore.getState();
  const groupId = payload?.groupId ?? payload?.objectId ?? payload?.id;
  const group = groupId ? scene.nodes[groupId] : undefined;
  if (!group || group.type !== "group") {
    respondError(requestId, `Group ${JSON.stringify(groupId)} not found`);
    return;
  }
  const children = [...(group as LooseRecord).children as string[]];
  store.applyCommands([{ type: "UNGROUP_NODE", id: groupId }]);
  store.setSelectedIds(children);
  respond(requestId, { success: true, groupId, children });
}

async function fitToArtboard(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const store = useSceneEditorStore.getState();
  const selected = (store.selectedIds ?? []).filter((id) => scene.nodes[id]);
  if (selected.length === 0) {
    respondError(
      requestId,
      "No selected objects to fit. Call arrange op=select first.",
    );
    return;
  }
  const padding = Number(payload?.padding ?? 0) || 0;
  if (
    selected.length === 1 &&
    (scene.nodes[selected[0]!].type === "group" ||
      scene.nodes[selected[0]!].type === "line")
  ) {
    respondError(
      requestId,
      "arrange op=fit currently supports single rect/ellipse/image/text/polygon selections",
    );
    return;
  }
  const { commands } = buildFitToArtboardCommands(scene, selected, padding);
  if (commands.length > 0) store.applyCommands(commands);
  respond(requestId, { success: true, fittedCount: commands.length, padding });
}

// ─── validation ───────────────────────────────────────────────────────────────

async function validateCanvas(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload ?? {});
  if (!scene) return;
  const families = new Set<string>();
  for (const node of Object.values(scene.nodes)) {
    if (node.type === "text") {
      const family = String((node as LooseRecord).fontFamily ?? "").trim();
      if (family) families.add(family);
    }
  }
  for (const family of Array.isArray(payload?.families) ? payload.families : []) {
    if (typeof family === "string" && family.trim()) families.add(family.trim());
  }
  if (families.size > 0) {
    await Promise.race([
      ensureGoogleFontsForFamilies([...families]),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
  }
  const loadedFonts: Record<string, boolean> = {};
  if (typeof document !== "undefined" && document.fonts) {
    for (const family of families) {
      try {
        loadedFonts[family] = document.fonts.check('16px "' + family.replace(/"/g, "") + '"');
      } catch {
        loadedFonts[family] = false;
      }
    }
  }
  const report = validateScene(scene, {
    tolerance: Number(payload?.tolerance ?? 0.5),
    loadedFonts,
    checkTangencies: payload?.checkTangencies !== false,
  });
  respond(requestId, {
    success: true,
    ...report,
    fonts: loadedFonts,
    page: buildPageContext(
      useSceneEditorStore.getState().pages,
      useSceneEditorStore.getState().pageNames,
      useSceneEditorStore.getState().currentPage,
    ).page,
  });
}

// ─── export ───────────────────────────────────────────────────────────────────

function objectIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    if (text.startsWith("[")) {
      try {
        return objectIdList(JSON.parse(text));
      } catch {
        return [];
      }
    }
    return text.split(",").map((id) => id.trim()).filter(Boolean);
  }
  return [];
}

async function exportSvg(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload ?? {});
  if (!scene) return;
  try {
    const rawIds = payload?.objectIds ?? payload?.ids;
    const requestedIds = objectIdList(rawIds);
    if (requestedIds.length === 0 && typeof payload?.objectId === "string") {
      requestedIds.push(payload.objectId);
    }
    const scope =
      payload?.scope === "selection" || requestedIds.length > 0
        ? "selection"
        : "page";
    let objectIds = requestedIds;
    if (scope === "selection" && objectIds.length === 0) {
      objectIds = useSceneEditorStore.getState().selectedIds ?? [];
    }
    if (scope === "selection") {
      objectIds = objectIds.filter((id) => Boolean(scene.nodes[id]));
      if (objectIds.length === 0) {
        respondError(requestId, "No matching objects to export as SVG.");
        return;
      }
      const svg = await buildSelectionSvg(scene, objectIds);
      if (!svg) {
        respondError(requestId, "Nothing to export — check the selection.");
        return;
      }
      respond(requestId, {
        success: true,
        scope,
        objectIds,
        svg,
        bytes: svg.length,
      });
      return;
    }

    const svg = await buildPageSvg(scene);
    respond(requestId, {
      success: true,
      scope: "page",
      objectIds: [],
      svg,
      width: scene.artboard.width,
      height: scene.artboard.height,
      bytes: svg.length,
    });
  } catch (err: any) {
    respondError(requestId, err?.message || "SVG export failed");
  }
}

async function exportImage(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload ?? {});
  if (!scene) return;
  if (payload?.format === "svg") {
    await exportSvg(payload, requestId);
    return;
  }
  try {
    const exportId =
      typeof payload?.objectId === "string" && payload.objectId
        ? payload.objectId
        : null;
    if (exportId && !scene.nodes[exportId]) {
      respondError(requestId, `Object ${exportId} not found in scene`);
      return;
    }

    const plan = planExport(scene, payload ?? {});
    const canvas = await renderSceneToExportCanvas(scene, {
      multiplier: plan.multiplier,
      prePaint: plan.prePaintBackground,
    });
    if (!canvas) {
      respondError(requestId, "Failed to render scene");
      return;
    }

    let imageData: string;
    let width = canvas.width;
    let height = canvas.height;
    if (exportId) {
      const cropped = cropCanvasToNodeCanvas(canvas, scene, exportId);
      if (!cropped) {
        respondError(requestId, `Could not crop object ${exportId}`);
        return;
      }
      imageData = canvasToPngBase64(cropped);
      width = cropped.width;
      height = cropped.height;
    } else {
      imageData = canvasToPngBase64(canvas);
    }

    respond(requestId, {
      success: true,
      imageData,
      multiplier: plan.multiplier,
      width,
      height,
    });
  } catch (err: unknown) {
    respondError(requestId, (err as Error)?.message || "Export failed");
  }
}

// ─── vector drawing ──────────────────────────────────────────────────────────

/**
 * Place a drawing produced by the Go vector tool. The tool has already resolved
 * the IR to SVG; this handler only inserts the image node and reports its id so
 * later vector op=update calls can target it.
 */
async function vectorDraw(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload ?? {});
  if (!scene) return;
  const built = buildVectorPlaceCommands(scene, payload as VectorPlacePayload);
  if ("error" in built) {
    respondError(requestId, built.error);
    return;
  }
  const store = useSceneEditorStore.getState();
  store.applyCommands(built.commands);
  store.setSelectedIds([built.created.id]);
  respond(requestId, {
    success: true,
    objectId: built.created.id,
    bounds: built.created.bounds,
    message: `Placed ${built.created.name}`,
  });
}

async function vectorUpdate(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload ?? {});
  if (!scene) return;
  const target = resolveNodeTarget(scene, payload ?? {});
  if (!target.ok) {
    respondError(requestId, target.error);
    return;
  }
  const objectId = target.id;
  const built = buildVectorUpdateCommand(scene, objectId, {
    src: String(payload?.src ?? ""),
    name: typeof payload?.name === "string" ? payload.name : undefined,
  });
  if ("error" in built) {
    respondError(requestId, built.error);
    return;
  }
  useSceneEditorStore.getState().applyCommands([built.command]);
  respond(requestId, { success: true, objectId });
}

async function vectorDelete(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireTargetScene(requestId, payload ?? {});
  if (!scene) return;
  const target = resolveNodeTarget(scene, payload ?? {});
  if (!target.ok) {
    respondError(requestId, target.error);
    return;
  }
  const objectId = target.id;
  if (!scene.nodes[objectId]) {
    // The element may already have been removed by hand; forgetting the board
    // is still the right outcome, so report success rather than an error.
    respond(requestId, { success: true, objectId, deleted: false });
    return;
  }
  const store = useSceneEditorStore.getState();
  store.applyCommands([{ type: "DELETE_NODE", id: objectId }]);
  store.setSelectedIds(store.selectedIds.filter((id) => id !== objectId));
  respond(requestId, { success: true, objectId, deleted: true });
}

// ─── React wiring ─────────────────────────────────────────────────────────────

/**
 * Subscribe the app to MCP tool actions for the root route's lifetime.
 * The router's navigate is injected so create_canvas/open_workspace can hand
 * off to the /scene route as the single writer.
 */
export function useMCPActions(): void {
  const navigate = useNavigate();

  useEffect(() => {
    return subscribeToMCPActions((data) => {
      const startedAt = performance.now();
      void handleMCPAction(
        {
          navigate: (options: LooseRecord) => {
            void navigate(options as any);
          },
        },
        data,
      ).finally(() => {
        const elapsedMs = performance.now() - startedAt;
        if (isOverBudget(data.action, elapsedMs)) {
          console.warn(
            `[MCP] ${data.action} took ${Math.round(elapsedMs)}ms, over its ${budgetFor(data.action)}ms budget`,
          );
        }
      });
    });
  }, [navigate]);
}
