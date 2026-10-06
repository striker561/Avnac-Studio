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
import { useSceneEditorStore } from "@/features/scene-editor/store";
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
} from "@/lib/mcp/commands";
import {
  buildCanvasSummary,
  buildObjectList,
  buildSelectionSummary,
} from "@/lib/mcp/summaries";
import {
  annotateSceneCanvas,
  canvasToPngBase64,
  cropCanvasToNodeBase64,
  renderScenePreviewBase64,
  renderSceneToExportCanvas,
} from "@/lib/mcp/canvas-export";
import { subscribeToMCPActions } from "@/lib/mcp/transport";

type LooseRecord = Record<string, any>;

/** Router navigation subset the file tools need. */
interface MCPDeps {
  navigate?: (options: LooseRecord) => unknown;
}

// ─── response helpers ─────────────────────────────────────────────────────────

function respond(requestId: string | undefined, data: LooseRecord): void {
  if (requestId) SubmitResponse(requestId, data);
}

function respondError(requestId: string | undefined, error: string): void {
  if (requestId) SubmitResponse(requestId, { error });
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
  try {
    switch (action) {
      case "create_canvas":
        return await createCanvas(deps, payload ?? {}, requestId);
      case "open_workspace":
        return await openWorkspace(deps, payload ?? {}, requestId);
      case "rename_workspace":
        return await renameWorkspace(payload ?? {}, requestId);
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
      case "get_font_list":
        return await getFontList(requestId);
      default:
        respondError(requestId, `Unknown action '${action}'`);
    }
  } catch (e: any) {
    console.error("Failed to handle MCP action:", e);
    try {
      if (actionData.requestId) {
        SubmitResponse(actionData.requestId, {
          error: e?.message || "Internal error handling MCP action",
        });
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
        SubmitResponse(requestId, {
          success: !title || persistedName === title,
          id: newId,
          name: persistedName,
          width: done.scene?.artboard.width ?? w,
          height: done.scene?.artboard.height ?? h,
          message: title
            ? `Canvas '${persistedName}' created and navigated to /scene`
            : "Canvas created and navigated to /scene",
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
        SubmitResponse(requestId, {
          success: !title || persistedName === title,
          id: newId,
          name: persistedName,
          width: done.scene?.artboard.width ?? w,
          height: done.scene?.artboard.height ?? h,
          message: "Canvas created",
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
    respondError(requestId, "fileId is required (from list_files)");
    return;
  }
  try {
    const record = await idbGetEditorRecord(fileId);
    if (!record) {
      respondError(
        requestId,
        `No saved file with id '${fileId}'. Call list_files to see available canvases.`,
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

// ─── element creation / modification ──────────────────────────────────────────

async function renderElements(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;

  const { elements, includePreview } = payload;
  if (!elements || !Array.isArray(elements)) {
    respondError(requestId, "elements must be an array");
    return;
  }

  const { commands, created } = buildRenderElementsCommands(scene, elements);
  if (commands.length > 0) {
    useSceneEditorStore.getState().applyCommands(commands);
  }

  if (requestId) {
    if (includePreview) {
      try {
        const updatedScene = useSceneEditorStore.getState().scene;
        if (updatedScene) {
          const imageData = await renderScenePreviewBase64(updatedScene);
          SubmitResponse(requestId, { created, imageData });
          return;
        }
      } catch (err) {
        console.warn("Failed to generate preview for render_elements:", err);
      }
    }
    SubmitResponse(requestId, { created });
  }
}

async function modifyElements(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;

  const { modifications, includePreview } = payload;
  if (!modifications || !Array.isArray(modifications)) {
    respondError(requestId, "modifications must be an array");
    return;
  }

  const { commands, modifiedCount } = buildModifyElementsCommands(
    scene,
    modifications,
  );
  if (commands.length > 0) {
    useSceneEditorStore.getState().applyCommands(commands);
  }

  if (requestId) {
    if (includePreview) {
      try {
        const updatedScene = useSceneEditorStore.getState().scene;
        if (updatedScene) {
          const imageData = await renderScenePreviewBase64(updatedScene);
          SubmitResponse(requestId, { modifiedCount, imageData });
          return;
        }
      } catch (err) {
        console.warn("Failed to generate preview for modify_elements:", err);
      }
    }
    SubmitResponse(requestId, { modifiedCount });
  }
}

// ─── scene queries ────────────────────────────────────────────────────────────

async function getCanvasSummary(requestId: string | undefined): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  respond(requestId, buildCanvasSummary(scene));
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
    const canvas = await renderSceneToExportCanvas(scene, 1024, true);
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
  const scene = await requireScene(requestId);
  if (!scene) return;
  const node = scene.nodes[payload?.objectId];
  if (node) {
    respond(requestId, { node });
  } else {
    respondError(requestId, `Object ${payload?.objectId} not found`);
  }
}

async function listObjects(requestId: string | undefined): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  respond(requestId, { objects: buildObjectList(scene) });
}

async function getSelection(requestId: string | undefined): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  const selectedIds = useSceneEditorStore.getState().selectedIds ?? [];
  respond(requestId, buildSelectionSummary(scene, selectedIds));
}

async function getFontList(requestId: string | undefined): Promise<void> {
  respond(requestId, { fonts: GOOGLE_FONT_FAMILIES });
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
  const scene = await requireScene(requestId);
  if (!scene) return;
  const store = useSceneEditorStore.getState();
  const objectId = payload?.objectId;
  if (objectId) {
    if (!scene.nodes[objectId]) {
      respondError(requestId, `Object ${objectId} not found`);
      return;
    }
    store.applyCommands([{ type: "DELETE_NODE", id: objectId }]);
    const next = useSceneEditorStore.getState();
    next.setSelectedIds(next.selectedIds.filter((id) => id !== objectId));
    respond(requestId, { success: true, deletedId: objectId });
    return;
  }
  const selected = store.selectedIds ?? [];
  if (selected.length === 0) {
    respondError(
      requestId,
      "No objectId provided and no current selection to delete",
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
  if (requestId) {
    const updated = useSceneEditorStore.getState().scene;
    SubmitResponse(requestId, {
      success: true,
      background: updated?.artboard.bg ?? parseColor(color),
    });
  }
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
      `Unknown align type ${JSON.stringify(payload?.type)}. Expected one of left, center, right, top, middle, bottom.`,
    );
    return;
  }
  const store = useSceneEditorStore.getState();
  const selected = (store.selectedIds ?? []).filter((id) => scene.nodes[id]);
  if (selected.length === 0) {
    respondError(
      requestId,
      "No selected objects to align. Call select_objects first.",
    );
    return;
  }
  const { commands, alignedCount } = buildAlignCommands(scene, selected, kind);
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
      `distribute_objects needs at least 3 selected objects (got ${selected.length}). Call select_objects first.`,
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
      "No selected objects to fit. Call select_objects first.",
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
      "fit_to_artboard currently supports single rect/ellipse/image/text/polygon selections",
    );
    return;
  }
  const { commands } = buildFitToArtboardCommands(scene, selected, padding);
  if (commands.length > 0) store.applyCommands(commands);
  respond(requestId, { success: true, fittedCount: commands.length, padding });
}

// ─── export ───────────────────────────────────────────────────────────────────

async function exportImage(
  payload: MCPPayload,
  requestId: string | undefined,
): Promise<void> {
  const scene = await requireScene(requestId);
  if (!scene) return;
  try {
    const canvas = await renderSceneToExportCanvas(
      scene,
      2048,
      !payload?.transparent,
    );
    if (!canvas) {
      respondError(requestId, "Failed to render scene");
      return;
    }
    const exportId = payload?.objectId;
    if (exportId) {
      const targetNode = scene.nodes[exportId];
      if (!targetNode) {
        respondError(requestId, `Object ${exportId} not found in scene`);
        return;
      }
      if (payload?.format === "svg") {
        respondError(
          requestId,
          "SVG object export is not yet supported via MCP; use PNG format",
        );
        return;
      }
    }
    respond(requestId, { success: true, imageData: canvasToPngBase64(canvas) });
  } catch (err: unknown) {
    respondError(requestId, (err as Error)?.message || "Export failed");
  }
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
      void handleMCPAction(
        {
          navigate: (options: LooseRecord) => {
            void navigate(options as any);
          },
        },
        data,
      );
    });
  }, [navigate]);
}
