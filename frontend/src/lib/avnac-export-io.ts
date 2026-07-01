import { ExportPng, ExportTextFile } from "../../wailsjs/go/avnacio/IOManager";

export function hasNativeBridge(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { go?: unknown }).go !== "undefined"
  );
}

export function downloadJsonViaBrowser(
  filename: string,
  payload: unknown,
): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadDataUrlViaBrowser(
  filename: string,
  dataUrl: string,
): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export function downloadSvgViaBrowser(filename: string, svg: string): void {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportTextFileNativeOrBrowser(
  filename: string,
  text: string,
  options: {
    logLabel?: string;
    fallback: () => void;
  },
): Promise<void> {
  if (!hasNativeBridge()) {
    options.fallback();
    return;
  }

  try {
    await ExportTextFile(filename, text);
  } catch (error) {
    console.error(
      `[avnac] ${options.logLabel ?? "native export"} failed, falling back to browser`,
      error,
    );
    options.fallback();
  }
}

export async function exportPngNativeOrBrowser(
  filename: string,
  dataUrl: string,
  options?: { logLabel?: string },
): Promise<void> {
  if (!hasNativeBridge()) {
    downloadDataUrlViaBrowser(filename, dataUrl);
    return;
  }

  try {
    await ExportPng(filename, dataUrl);
  } catch (error) {
    console.error(
      `[avnac] ${options?.logLabel ?? "native PNG export"} failed, falling back to browser download`,
      error,
    );
    downloadDataUrlViaBrowser(filename, dataUrl);
  }
}
