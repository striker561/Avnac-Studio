import type {
  SaraswatiResizeHandle,
  SaraswatiCommand,
} from "../commands/types";
import type { SaraswatiScene } from "../scene";
import type { SaraswatiBounds } from "../spatial";
import { findTopHitNodeId } from "../spatial";

export type { SaraswatiResizeHandle };

const DEFAULT_ROTATION_SENSITIVITY = 0.75;

type ResizeDragState = {
  handle: SaraswatiResizeHandle;
  nodeId: string;
  startBounds: SaraswatiBounds;
  startX: number;
  startY: number;
};

type RotateDragState = {
  nodeId: string;
  centerX: number;
  centerY: number;
  lastAngle: number;
  /** Raw (unsnapped) accumulated rotation in degrees — used as the accumulation
   * base so snap zones don't become sticky. */
  lastRotation: number;
};

export type SaraswatiPointerState = {
  activeNodeId: string | null;
  pointerId: number | null;
  lastX: number;
  lastY: number;
  resize: ResizeDragState | null;
  rotate: RotateDragState | null;
};

export function createIdlePointerState(): SaraswatiPointerState {
  return {
    activeNodeId: null,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    resize: null,
    rotate: null,
  };
}

export function pointerDown(
  scene: SaraswatiScene,
  pointerId: number,
  x: number,
  y: number,
): { state: SaraswatiPointerState; selectedIds: string[] } {
  const hitId = findTopHitNodeId(scene, { x, y });
  if (!hitId) {
    return {
      state: createIdlePointerState(),
      selectedIds: [],
    };
  }
  return {
    state: {
      activeNodeId: hitId,
      pointerId,
      lastX: x,
      lastY: y,
      resize: null,
      rotate: null,
    },
    selectedIds: [hitId],
  };
}

export function resizeHandlePointerDown(
  nodeId: string,
  handle: SaraswatiResizeHandle,
  startBounds: SaraswatiBounds,
  pointerId: number,
  x: number,
  y: number,
): SaraswatiPointerState {
  return {
    activeNodeId: nodeId,
    pointerId,
    lastX: x,
    lastY: y,
    resize: { handle, nodeId, startBounds, startX: x, startY: y },
    rotate: null,
  };
}

export function rotateHandlePointerDown(
  nodeId: string,
  bounds: SaraswatiBounds,
  startRotation: number,
  pointerId: number,
  x: number,
  y: number,
): SaraswatiPointerState {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return {
    activeNodeId: nodeId,
    pointerId,
    lastX: x,
    lastY: y,
    resize: null,
    rotate: {
      nodeId,
      centerX,
      centerY,
      lastAngle: Math.atan2(y - centerY, x - centerX),
      lastRotation: normalizeDegrees(startRotation),
    },
  };
}

export function pointerMove(
  state: SaraswatiPointerState,
  pointerId: number,
  x: number,
  y: number,
  options?: { rotationSensitivity?: number },
): { state: SaraswatiPointerState; command: SaraswatiCommand | null } {
  if (state.pointerId !== pointerId || !state.activeNodeId) {
    return { state, command: null };
  }
  const newState = { ...state, lastX: x, lastY: y };

  if (state.resize) {
    const { handle, nodeId, startBounds, startX, startY } = state.resize;
    const dx = x - startX;
    const dy = y - startY;
    const b = computeResizeBounds(startBounds, handle, dx, dy);
    return {
      state: newState,
      command: { type: "RESIZE_NODE", id: nodeId, handle, ...b },
    };
  }

  if (state.rotate) {
    const sensitivity = Math.max(
      0.1,
      Math.min(1.5, options?.rotationSensitivity ?? DEFAULT_ROTATION_SENSITIVITY),
    );
    const { nodeId, centerX, centerY, lastAngle, lastRotation } = state.rotate;
    const currentAngle = Math.atan2(y - centerY, x - centerX);
    const deltaDeg = shortestAngularDelta(
      (lastAngle * 180) / Math.PI,
      (currentAngle * 180) / Math.PI,
    );
    // Accumulate into raw (unsnapped) rotation so snap zones don't become sticky.
    const rawRotation = normalizeDegrees(lastRotation + deltaDeg * sensitivity);
    // Snap is applied only to the command output, not to the state accumulator.
    const commandRotation = snapRotationToCommonDegrees(rawRotation, sensitivity);
    return {
      state: {
        ...newState,
        rotate: {
          ...state.rotate,
          lastAngle: currentAngle,
          lastRotation: rawRotation,
        },
      },
      command: { type: "ROTATE_NODE", id: nodeId, rotation: commandRotation },
    };
  }

  const dx = x - state.lastX;
  const dy = y - state.lastY;
  if (dx === 0 && dy === 0) return { state, command: null };
  return {
    state: newState,
    command: {
      type: "MOVE_NODE",
      id: state.activeNodeId,
      dx,
      dy,
    },
  };
}

function computeResizeBounds(
  s: SaraswatiBounds,
  handle: SaraswatiResizeHandle,
  dx: number,
  dy: number,
): { x: number; y: number; width: number; height: number } {
  const minSize = 1;
  let x = s.x,
    y = s.y,
    w = s.width,
    h = s.height;
  // horizontal
  if (handle === "nw" || handle === "sw" || handle === "w") {
    const newW = Math.max(minSize, s.width - dx);
    x = s.x + s.width - newW;
    w = newW;
  } else if (handle === "ne" || handle === "se" || handle === "e") {
    w = Math.max(minSize, s.width + dx);
  }
  // vertical
  if (handle === "nw" || handle === "ne" || handle === "n") {
    const newH = Math.max(minSize, s.height - dy);
    y = s.y + s.height - newH;
    h = newH;
  } else if (handle === "sw" || handle === "se" || handle === "s") {
    h = Math.max(minSize, s.height + dy);
  }
  return { x, y, width: w, height: h };
}

export function pointerUp(
  state: SaraswatiPointerState,
  pointerId: number,
): SaraswatiPointerState {
  if (state.pointerId !== pointerId) return state;
  return createIdlePointerState();
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360 || 0;
}

function shortestAngularDelta(from: number, to: number): number {
  const forward = normalizeDegrees(to) - normalizeDegrees(from);
  if (forward > 180) return forward - 360;
  if (forward < -180) return forward + 360;
  return forward;
}

function snapRotationToCommonDegrees(rotation: number, sensitivity: number): number {
  const normalized = normalizeDegrees(rotation);
  // sensitivity 0.1 → very tight snap (~1°); 1.5 → wider snap (~6°)
  // window is intentionally small so snap only activates when very close.
  const sensitivityNorm = Math.max(0, Math.min(1, (sensitivity - 0.1) / 1.4));
  const snapWindow = 1 + sensitivityNorm * 5;

  let bestAngle = normalized;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let step = 0; step < 360; step += 30) {
    const delta = Math.abs(shortestAngularDelta(normalized, step));
    if (delta < bestDelta) {
      bestDelta = delta;
      bestAngle = step;
    }
  }

  if (bestDelta <= snapWindow) {
    return normalizeDegrees(bestAngle);
  }
  return normalized;
}
