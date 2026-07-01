export function anchorToCenter(
  anchor: number,
  origin: string | undefined,
  renderedSize: number,
  isX: boolean,
): number {
  const axisOrigin = origin || (isX ? "left" : "top");
  const factor =
    axisOrigin === "center"
      ? 0.5
      : axisOrigin === "right" || axisOrigin === "bottom"
        ? 1
        : 0;
  return anchor + (0.5 - factor) * renderedSize;
}
