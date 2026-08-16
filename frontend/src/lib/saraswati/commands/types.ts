import type { SaraswatiColor, SaraswatiShadow } from "../types";
import type { SaraswatiClipPath, SaraswatiNode } from "../types";

export type SaraswatiResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export type SaraswatiCommand =
  | { type: "MOVE_NODE"; id: string; dx: number; dy: number }
  | { type: "ROTATE_NODE"; id: string; rotation: number }
  | {
      type: "RESIZE_NODE";
      id: string;
      /** New bounding-box x (top-left, scene coords). */
      x: number;
      /** New bounding-box y (top-left, scene coords). */
      y: number;
      width: number;
      height: number;
      /** Handle being dragged when this comes from a pointer resize gesture. */
      handle?: SaraswatiResizeHandle;
    }
  | { type: "ADD_NODE"; node: SaraswatiNode }
  | { type: "DELETE_NODE"; id: string }
  | { type: "REPLACE_NODE"; node: SaraswatiNode }
  | { type: "SET_GROUP_CHILDREN"; id: string; children: string[] }
  | { type: "GROUP_NODES"; id: string; parentId: string; children: string[] }
  | { type: "UNGROUP_NODE"; id: string }
  | { type: "SET_NODE_VISIBLE"; id: string; visible: boolean }
  | { type: "SET_NODE_NAME"; id: string; name: string }
  | {
      type: "SET_NODE_CLIP_PATH";
      id: string;
      clipPath: SaraswatiClipPath | null;
    }
  | {
      type: "SET_NODE_CLIP_STACK";
      id: string;
      clipPathStack: SaraswatiClipPath[];
    }
  | {
      /** Resize the artboard and/or change its background. Omit fields to leave them unchanged. */
      type: "SET_ARTBOARD";
      width?: number;
      height?: number;
      bg?: SaraswatiColor;
    }
  | {
      /** Set fill color/gradient on any paint node (rect, ellipse, polygon, star, text). */
      type: "SET_NODE_FILL";
      id: string;
      fill: SaraswatiColor;
    }
  | {
      /** Set stroke color/gradient + width on any paint node or line. */
      type: "SET_NODE_STROKE";
      id: string;
      stroke: SaraswatiColor | null;
      strokeWidth?: number;
    }
  | {
      /** Set corner radius on a rect node. */
      type: "SET_NODE_CORNER_RADIUS";
      id: string;
      radiusX: number;
      radiusY: number;
    }
  | {
      /** Set text formatting properties on a text node. */
      type: "SET_TEXT_FORMAT";
      id: string;
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: string;
      fontStyle?: "normal" | "italic";
      textAlign?: "left" | "center" | "right";
      underline?: boolean;
      color?: SaraswatiColor;
      lineHeight?: number;
    }
  | {
      /** Replace text content on a text node. */
      type: "SET_TEXT_CONTENT";
      id: string;
      text: string;
    }
  | {
      /** Set opacity on any node (0–1, clamped). */
      type: "SET_NODE_OPACITY";
      id: string;
      opacity: number;
    }
  | {
      /** Set or clear the drop-shadow on any node. */
      type: "SET_NODE_SHADOW";
      id: string;
      shadow: SaraswatiShadow | null;
    }
  | {
      /** Set Gaussian blur amount (0–100 %) on any node. */
      type: "SET_NODE_BLUR";
      id: string;
      blur: number;
    }
  | {
      /** Update image crop source rectangle. */
      type: "SET_IMAGE_CROP";
      id: string;
      cropX: number;
      cropY: number;
      cropWidth?: number;
      cropHeight?: number;
    }
  | {
      /** Round image corners by applying a rectangular clip-path radius. */
      type: "SET_IMAGE_BORDER_RADIUS";
      id: string;
      radius: number;
    }
  | {
      /** Rebuild polygon points using a side/point count. */
      type: "SET_POLYGON_SIDES";
      id: string;
      sides: number;
      star?: boolean;
    };

export type Command = SaraswatiCommand;
