// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaraswatiImageNode, SaraswatiScene } from "@/lib/saraswati";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import { useRemoveBg } from "@/lib/use-remove-bg";
import { useRembgProcessingStore } from "@/features/scene-editor/store/rembg-processing-store";
import { useSceneEditorStore } from "@/features/scene-editor/store";

const eventHandlers = new Map<string, (payload: unknown) => void>();

vi.mock("../../../wailsjs/runtime/runtime", () => ({
  EventsOn: (event: string, handler: (payload: unknown) => void) => {
    eventHandlers.set(event, handler);
    return () => {
      eventHandlers.delete(event);
    };
  },
}));

const startRemoveBackground = vi.fn();

vi.mock("../../../wailsjs/go/main/App", () => ({
  StartRemoveBackground: (...args: unknown[]) => startRemoveBackground(...args),
}));

vi.mock("@/lib/image-pixel-utils", () => ({
  readImageNaturalSize: vi.fn(async () => ({ width: 400, height: 300 })),
  fitDisplaySizeToNatural: vi.fn(() => ({ width: 100, height: 75 })),
}));

function makeImageNode(
  overrides: Partial<SaraswatiImageNode> = {},
): SaraswatiImageNode {
  return {
    id: "img-1",
    type: "image",
    parentId: null,
    visible: true,
    opacity: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    originX: "left",
    originY: "top",
    src: "data:image/png;base64,AAAA",
    cropX: 10,
    cropY: 20,
    cropWidth: 80,
    cropHeight: 60,
    clipPath: null,
    ...overrides,
  };
}

function seedScene(node: SaraswatiImageNode): SaraswatiScene {
  const scene = createEmptySaraswatiScene({ width: 400, height: 300 });
  node.parentId = scene.root;
  scene.nodes[node.id] = node;
  const root = scene.nodes[scene.root];
  if (root?.type === "group") {
    scene.nodes[scene.root] = {
      ...root,
      children: [...root.children, node.id],
    };
  }
  return scene;
}

function Harness({
  nodeId,
  node,
  onReady,
}: {
  nodeId: string;
  node: SaraswatiImageNode;
  onReady: (api: ReturnType<typeof useRemoveBg>) => void;
}) {
  const api = useRemoveBg(nodeId, node);
  onReady(api);
  return <button type="button">remove</button>;
}

describe("useRemoveBg", () => {
  beforeEach(() => {
    eventHandlers.clear();
    startRemoveBackground.mockReset();
    useRembgProcessingStore.setState({ processingNodes: {} });

    const node = makeImageNode();
    useSceneEditorStore.setState({
      scene: seedScene(node),
      applyCommands: vi.fn(),
    } as Partial<ReturnType<typeof useSceneEditorStore.getState>>);

    Object.defineProperty(window, "go", {
      configurable: true,
      value: {
        main: {
          App: {
            StartRemoveBackground: () => undefined,
          },
        },
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["png"], { type: "image/png" }),
    } as Response);
  });

  it("submits the image and marks the node as processing", async () => {
    startRemoveBackground.mockResolvedValue(undefined);
    let api: ReturnType<typeof useRemoveBg> | null = null;

    render(
      <Harness
        nodeId="img-1"
        node={makeImageNode()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    await act(async () => {
      await api!.startRemoveBg();
    });

    expect(startRemoveBackground).toHaveBeenCalledWith(
      expect.stringContaining("data:"),
      "img-1",
    );
    expect(useRembgProcessingStore.getState().processingNodes).toEqual({
      "img-1": true,
    });
    expect(api!.isProcessing).toBe(true);
  });

  it("replaces the image node and clears crop fields on completion", async () => {
    startRemoveBackground.mockResolvedValue(undefined);
    const applyCommands = vi.fn();
    useSceneEditorStore.setState({
      scene: seedScene(makeImageNode()),
      applyCommands,
    } as Partial<ReturnType<typeof useSceneEditorStore.getState>>);

    render(
      <Harness
        nodeId="img-1"
        node={makeImageNode()}
        onReady={() => undefined}
      />,
    );

    const complete = eventHandlers.get("rembg:complete");
    expect(complete).toBeTypeOf("function");

    act(() => {
      complete?.({
        nodeId: "img-1",
        jobId: "job-1",
        resultDataUrl: "data:image/png;base64,RESULT",
      });
    });

    await waitFor(() => {
      expect(applyCommands).toHaveBeenCalledWith([
        {
          type: "REPLACE_NODE",
          node: expect.objectContaining({
            id: "img-1",
            src: "data:image/png;base64,RESULT",
            width: 100,
            height: 75,
            cropX: 0,
            cropY: 0,
            cropWidth: undefined,
            cropHeight: undefined,
          }),
        },
      ]);
    });

    expect(useRembgProcessingStore.getState().processingNodes).toEqual({});
  });

  it("surfaces backend errors for the active node", async () => {
    startRemoveBackground.mockResolvedValue(undefined);
    let api: ReturnType<typeof useRemoveBg> | null = null;

    render(
      <Harness
        nodeId="img-1"
        node={makeImageNode()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    await act(async () => {
      await api!.startRemoveBg();
    });

    const errorHandler = eventHandlers.get("rembg:error");
    act(() => {
      errorHandler?.({
        nodeId: "img-1",
        jobId: "job-err",
        errorMsg: "background removal failed",
      });
    });

    await waitFor(() => {
      expect(api!.error).toBe("background removal failed");
      expect(api!.isProcessing).toBe(false);
    });
    expect(useRembgProcessingStore.getState().processingNodes).toEqual({});
  });

  it("ignores completion events for a different node", async () => {
    const applyCommands = vi.fn();
    useSceneEditorStore.setState({
      scene: seedScene(makeImageNode()),
      applyCommands,
    } as Partial<ReturnType<typeof useSceneEditorStore.getState>>);

    render(
      <Harness
        nodeId="img-1"
        node={makeImageNode()}
        onReady={() => undefined}
      />,
    );

    act(() => {
      eventHandlers.get("rembg:complete")?.({
        nodeId: "other-node",
        jobId: "job-2",
        resultDataUrl: "data:image/png;base64,OTHER",
      });
    });

    expect(applyCommands).not.toHaveBeenCalled();
  });

  it("reports when the Wails bridge is unavailable", async () => {
    Object.defineProperty(window, "go", {
      configurable: true,
      value: undefined,
    });

    let api: ReturnType<typeof useRemoveBg> | null = null;
    render(
      <Harness
        nodeId="img-1"
        node={makeImageNode()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    await act(async () => {
      await api!.startRemoveBg();
    });

    expect(api!.error).toContain("requires the app to be restarted");
    expect(startRemoveBackground).not.toHaveBeenCalled();
  });
});
