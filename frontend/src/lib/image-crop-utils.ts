export function resolveImageCropRect(
  crop: {
    x: number;
    y: number;
    cropWidth?: number;
    cropHeight?: number;
  },
  naturalWidth: number,
  naturalHeight: number,
) {
  return {
    x: crop.x,
    y: crop.y,
    w: crop.cropWidth ?? naturalWidth,
    h: crop.cropHeight ?? naturalHeight,
  };
}

export function fitImageNodeSizeToCrop(input: {
  nodeWidth: number;
  nodeHeight: number;
  prevCropWidth: number;
  prevCropHeight: number;
  nextCropWidth: number;
  nextCropHeight: number;
}) {
  const scaleX =
    input.prevCropWidth > 0 ? input.nodeWidth / input.prevCropWidth : 1;
  const scaleY =
    input.prevCropHeight > 0 ? input.nodeHeight / input.prevCropHeight : 1;
  return {
    width: Math.max(1, Math.round(input.nextCropWidth * scaleX)),
    height: Math.max(1, Math.round(input.nextCropHeight * scaleY)),
  };
}
