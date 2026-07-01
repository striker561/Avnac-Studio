import { extractImageUrlFromDataTransfer } from "@/lib/extract-image-url-from-data-transfer";

export type SceneDropIntent =
  | { kind: "vector-board"; boardId: string }
  | { kind: "image-files"; files: File[] }
  | { kind: "image-url"; url: string };

export function readSceneDropIntent(
  dataTransfer: DataTransfer,
  vectorBoardMime: string,
): SceneDropIntent | null {
  const boardId = dataTransfer.getData(vectorBoardMime);
  if (boardId) {
    return { kind: "vector-board", boardId };
  }

  const imageFiles = Array.from(dataTransfer.files).filter((file) =>
    file.type.startsWith("image/"),
  );
  if (imageFiles.length > 0) {
    return { kind: "image-files", files: imageFiles };
  }

  const remoteUrl = extractImageUrlFromDataTransfer(dataTransfer);
  if (remoteUrl) {
    return { kind: "image-url", url: remoteUrl };
  }

  return null;
}
