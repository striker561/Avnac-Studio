import type { AvnacDocumentV1 } from "../../avnac-document";
import { AVNAC_DOC_VERSION } from "../../avnac-document";
import type { BgValue } from "../../editor-paint";
import type {
  SaraswatiClipPath,
  SaraswatiGroupNode,
  SaraswatiNode,
  SaraswatiScene,
  SaraswatiShadow,
} from "../scene";

export function toAvnacDocument(scene: SaraswatiScene): AvnacDocumentV1 {
  const root = scene.nodes[scene.root];
  const objects =
    root && root.type === "group" ? serializeGroupChildren(scene, root) : [];

  return {
    v: AVNAC_DOC_VERSION,
    artboard: {
      width: scene.artboard.width,
      height: scene.artboard.height,
    },
    bg: cloneBgValue(scene.artboard.bg),
    fabric: {
      objects,
    },
  };
}

function serializeGroupChildren(
  scene: SaraswatiScene,
  group: SaraswatiGroupNode,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const childId of group.children) {
    const child = scene.nodes[childId];
    if (!child) continue;
    const row = serializeNode(scene, child);
    if (row) out.push(row);
  }
  return out;
}

function serializeNode(
  scene: SaraswatiScene,
  node: SaraswatiNode,
): Record<string, unknown> | null {
  if (node.type === "group") {
    return {
      type: "group",
      avnacLayerId: node.id,
      avnacLayerName: node.name,
      visible: node.visible,
      opacity: node.opacity,
      avnacShadow: serializeShadow(node.shadow),
      avnacBlur: node.blur ?? 0,
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      originX: "left",
      originY: "top",
      objects: serializeGroupChildren(scene, node),
    };
  }

  const common: Record<string, unknown> = {
    avnacLayerId: node.id,
    avnacLayerName: node.name,
    visible: node.visible,
    left: node.x,
    top: node.y,
    angle: node.rotation,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    opacity: node.opacity,
    originX: node.originX,
    originY: node.originY,
    avnacBlur: node.blur ?? 0,
    avnacShadow: serializeShadow(node.shadow),
  };

  switch (node.type) {
    case "rect": {
      const fill = paintToFabricRaw(node.fill);
      const stroke = paintToFabricRaw(node.stroke);
      return {
        ...common,
        type: "rect",
        width: node.width,
        height: node.height,
        rx: node.radiusX,
        ry: node.radiusY,
        avnacFill: cloneBgValue(node.fill),
        avnacStroke: node.stroke ? cloneBgValue(node.stroke) : undefined,
        fill,
        stroke,
        strokeWidth: node.strokeWidth,
        clipPath: serializeClipPath(node.clipPath ?? null),
        avnacClipPathStack: serializeClipPathStack(node.clipPathStack),
      };
    }
    case "ellipse": {
      const fill = paintToFabricRaw(node.fill);
      const stroke = paintToFabricRaw(node.stroke);
      return {
        ...common,
        type: "ellipse",
        rx: node.width / 2,
        ry: node.height / 2,
        width: node.width,
        height: node.height,
        avnacFill: cloneBgValue(node.fill),
        avnacStroke: node.stroke ? cloneBgValue(node.stroke) : undefined,
        fill,
        stroke,
        strokeWidth: node.strokeWidth,
        clipPath: serializeClipPath(node.clipPath ?? null),
        avnacClipPathStack: serializeClipPathStack(node.clipPathStack),
      };
    }
    case "polygon": {
      const fill = paintToFabricRaw(node.fill);
      const stroke = paintToFabricRaw(node.stroke);
      return {
        ...common,
        type: "polygon",
        points: node.points.map((point) => ({ x: point.x, y: point.y })),
        width: node.width,
        height: node.height,
        avnacShape: { kind: "polygon" },
        avnacFill: cloneBgValue(node.fill),
        avnacStroke: node.stroke ? cloneBgValue(node.stroke) : undefined,
        fill,
        stroke,
        strokeWidth: node.strokeWidth,
        clipPath: serializeClipPath(node.clipPath ?? null),
      };
    }
    case "text": {
      const fill = paintToFabricRaw(node.color);
      const stroke = paintToFabricRaw(node.stroke);
      return {
        ...common,
        type: "textbox",
        text: node.text,
        width: node.width,
        fontSize: node.fontSize,
        fontFamily: node.fontFamily,
        fontWeight: node.fontWeight,
        fontStyle: node.fontStyle,
        textAlign: node.textAlign,
        lineHeight: node.lineHeight,
        underline: node.underline,
        avnacFill: cloneBgValue(node.color),
        avnacStroke: node.stroke ? cloneBgValue(node.stroke) : undefined,
        fill,
        stroke,
        strokeWidth: node.strokeWidth,
        clipPath: serializeClipPath(node.clipPath ?? null),
        avnacClipPathStack: serializeClipPathStack(node.clipPathStack),
      };
    }
    case "image": {
      return {
        ...common,
        type: "image",
        width: node.width,
        height: node.height,
        src: node.src,
        cropX: node.cropX,
        cropY: node.cropY,
        cropWidth: node.cropWidth,
        cropHeight: node.cropHeight,
        avnacBorderRadius: node.borderRadius ?? 0,
        avnacCredit: node.credit ?? undefined,
        clipPath: serializeClipPath(node.clipPath ?? null),
        avnacClipPathStack: serializeClipPathStack(node.clipPathStack),
      };
    }
    case "line": {
      const stroke = paintToFabricRaw(node.stroke);
      const isArrow = !!node.arrowEnd;
      const cx = (node.x1 + node.x2) / 2;
      const cy = (node.y1 + node.y2) / 2;
      const angleDeg =
        (Math.atan2(node.y2 - node.y1, node.x2 - node.x1) * 180) / Math.PI;
      const L = Math.max(Math.hypot(node.x2 - node.x1, node.y2 - node.y1), 1);

      // Placeholder children so Fabric's loadFromJSON produces real Path/Polygon
      // instances. rehydrateAvnacStrokeLineLikeObject will re-layout them from
      // arrowEndpoints, so exact geometry here doesn't matter — only types do.
      const shaftPlaceholder: Record<string, unknown> = {
        type: "path",
        path: `M ${-L / 2} 0 L ${L / 2} 0`,
        originX: "center",
        originY: "center",
        stroke: stroke ?? "#262626",
        strokeWidth: node.strokeWidth,
        fill: "",
        selectable: false,
        evented: false,
        objectCaching: false,
      };
      const objects: Record<string, unknown>[] = [shaftPlaceholder];
      if (isArrow) {
        objects.push({
          type: "polygon",
          points: [
            { x: 0, y: -5 },
            { x: 10, y: 0 },
            { x: 0, y: 5 },
          ],
          originX: "left",
          originY: "center",
          fill: stroke ?? "#262626",
          stroke: null,
          strokeWidth: 0,
          selectable: false,
          evented: false,
          objectCaching: false,
        });
      }

      return {
        type: "group",
        avnacLayerId: node.id,
        avnacLayerName: node.name,
        visible: node.visible,
        opacity: node.opacity,
        left: cx,
        top: cy,
        angle: angleDeg,
        width: L,
        height: node.strokeWidth,
        scaleX: 1,
        scaleY: 1,
        originX: "center",
        originY: "center",
        subTargetCheck: false,
        interactive: false,
        objectCaching: false,
        avnacBlur: node.blur ?? 0,
        avnacShadow: serializeShadow(node.shadow),
        avnacFill: cloneBgValue(node.stroke),
        avnacStroke: cloneBgValue(node.stroke),
        fill: stroke,
        stroke,
        avnacShape: {
          kind: isArrow ? "arrow" : "line",
          arrowEndpoints: {
            x1: node.x1,
            y1: node.y1,
            x2: node.x2,
            y2: node.y2,
          },
          arrowStrokeWidth: node.strokeWidth,
          arrowHead: isArrow ? 1 : 0,
          arrowStart: node.arrowStart,
          arrowLineStyle: node.lineStyle,
          arrowPathType: node.pathType,
          arrowCurveBulge: node.curveBulge,
          arrowCurveT: node.curveT,
        },
        objects,
      };
    }
  }
}

function serializeClipPath(
  clipPath: SaraswatiClipPath | null,
): Record<string, unknown> | undefined {
  if (!clipPath) return undefined;
  if (clipPath.type === "rect") {
    return {
      type: "rect",
      originX: "center",
      originY: "center",
      left: clipPath.x,
      top: clipPath.y,
      width: clipPath.width,
      height: clipPath.height,
      rx: clipPath.radiusX,
      ry: clipPath.radiusY,
    };
  }
  return {
    type: "ellipse",
    originX: "center",
    originY: "center",
    left: clipPath.x,
    top: clipPath.y,
    width: clipPath.width,
    height: clipPath.height,
    rx: clipPath.width / 2,
    ry: clipPath.height / 2,
  };
}

function serializeClipPathStack(
  stack: SaraswatiClipPath[] | undefined,
): Record<string, unknown>[] | undefined {
  if (!stack || stack.length === 0) return undefined;
  return stack.map((clipPath) => serializeClipPath(clipPath) ?? {});
}

/**
 * Shadows are plain data on the node. Persist them verbatim so the editor, the
 * canvas renderer and exports all see the same effect after a reload.
 */
function serializeShadow(
  shadow: SaraswatiShadow | null | undefined,
): Record<string, unknown> | null {
  if (!shadow) return null;
  return {
    blur: shadow.blur,
    offsetX: shadow.offsetX,
    offsetY: shadow.offsetY,
    colorHex: shadow.colorHex,
    opacityPct: shadow.opacityPct,
  };
}

function paintToFabricRaw(
  value: BgValue | null | undefined,
): string | undefined {
  if (!value) return undefined;
  if (value.type === "solid") return value.color;
  return value.css;
}

function cloneBgValue(bg: BgValue): BgValue {
  if (bg.type === "solid") return { ...bg };
  return {
    type: "gradient",
    angle: bg.angle,
    css: bg.css,
    stops: bg.stops.map((stop) => ({ ...stop })),
  };
}
