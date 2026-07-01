// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ImageCropModal from "@/components/editor/dialogs/image-crop-modal";

const readImageAlphaBounds = vi.fn();

vi.mock("@/lib/image-pixel-utils", () => ({
  readImageAlphaBounds: (...args: unknown[]) => readImageAlphaBounds(...args),
}));

function fireImageLoad(img: HTMLImageElement, w: number, h: number) {
  Object.defineProperty(img, "naturalWidth", { configurable: true, value: w });
  Object.defineProperty(img, "naturalHeight", { configurable: true, value: h });
  Object.defineProperty(img, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      width: w,
      height: h,
      top: 0,
      left: 0,
      right: w,
      bottom: h,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  fireEvent.load(img);
}

describe("unit: image-crop-modal", () => {
  beforeEach(() => {
    readImageAlphaBounds.mockReset();
    document.body.innerHTML = "";
  });

  it("preview trim updates crop rect before apply", async () => {
    readImageAlphaBounds.mockResolvedValue({
      x: 12,
      y: 18,
      width: 140,
      height: 90,
    });

    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <ImageCropModal
        open
        imageSrc="data:image/png;base64,trim-test"
        initialCrop={{ x: 0, y: 0, w: 200, h: 150 }}
        onCancel={onCancel}
        onApply={onApply}
      />,
    );

    const img = document.querySelector(
      'img[src="data:image/png;base64,trim-test"]',
    ) as HTMLImageElement;
    expect(img).toBeTruthy();
    act(() => {
      fireImageLoad(img, 200, 150);
    });

    const trimBtn = await screen.findByRole("button", {
      name: "Trim transparent",
    });
    await act(async () => {
      fireEvent.click(trimBtn);
    });

    await waitFor(() => {
      expect(readImageAlphaBounds).toHaveBeenCalledWith(
        "data:image/png;base64,trim-test",
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Apply crop" }));
    });

    expect(onApply).toHaveBeenCalledWith({
      cropX: 12,
      cropY: 18,
      width: 140,
      height: 90,
      sourceNaturalWidth: 200,
      sourceNaturalHeight: 150,
    });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
