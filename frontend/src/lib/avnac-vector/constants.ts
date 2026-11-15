/**
 * Fixed, document-space constants for the Avnac vector board.
 *
 * Geometry in a vector board lives in document user units and never depends on
 * the size of the canvas element. Every value here is either a document-space
 * default or a *screen-pixel* interaction constant that callers convert with
 * the current view scale (see view.ts).
 */

export const VECTOR_BOARD_DOC_VERSION = 3 as const

/** Default board size in document units. 4:3, the board keeps this aspect. */
export const DEFAULT_VECTOR_BOARD_WIDTH = 1200
export const DEFAULT_VECTOR_BOARD_HEIGHT = 900

export const VECTOR_BOARD_DRAG_MIME = 'application/avnac-vector-board'

/** Grid spacing in document units. */
export const VECTOR_BOARD_GRID_STEP = 24

export const VECTOR_ZOOM_MIN = 0.1
export const VECTOR_ZOOM_MAX = 12

/** Maximum number of rendered points in a fitted freehand path. */
export const VECTOR_PENCIL_DEFAULT_TOLERANCE_PX = 4
export const VECTOR_PENCIL_MIN_TOLERANCE_PX = 1
export const VECTOR_PENCIL_MAX_TOLERANCE_PX = 18

/** Interaction radii are expressed in screen pixels and divided by view.scale. */
export const VECTOR_PATH_HIT_RADIUS_PX = 6
export const VECTOR_ANCHOR_HIT_RADIUS_PX = 8
export const VECTOR_HANDLE_HIT_RADIUS_PX = 8
export const VECTOR_SNAP_TOLERANCE_PX = 8
export const VECTOR_MIN_DRAG_PX = 3

/** Overlay glyph sizes are screen pixels (divided by view.scale before draw). */
export const VECTOR_ANCHOR_SIZE_PX = 6
export const VECTOR_HANDLE_RADIUS_PX = 3
export const VECTOR_RESIZE_HANDLE_SIZE_PX = 8
export const VECTOR_MARQUEE_LINE_PX = 1

/** New strokes. */
export const VECTOR_DEFAULT_STROKE_WIDTH = 2
export const VECTOR_DEFAULT_STROKE_COLOR = '#1a1a1a'
export const VECTOR_DEFAULT_FILL_COLOR = '#94a3b8'

/** New shape drop size in document units when the user just clicks. */
export const VECTOR_DEFAULT_SHAPE_SIZE = 120

/** Undo history is capped by both entry count and approximate bytes. */
export const VECTOR_HISTORY_MAX_ENTRIES = 100
export const VECTOR_HISTORY_MAX_BYTES = 24 * 1024 * 1024

/** Angle snap step (degrees) for Alt-drag while drawing a pen node. */
export const VECTOR_ANGLE_LOCK_STEP_DEG = 15

/** Node-deletion refit: max allowed deviation, in screen pixels. */
export const VECTOR_DELETE_REFIT_TOLERANCE_PX = 2
