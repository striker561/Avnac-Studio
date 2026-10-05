import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect } from "react";
import SceneEditorPage from "@/features/scene-editor/scene-editor-page";
import { useSceneEditorStore } from "@/features/scene-editor/store";

type SceneSearch = {
  id?: string;
  w?: number;
  h?: number;
  name?: string;
};

function parseSearchDimension(v: unknown): number | undefined {
  const n =
    typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.min(16000, Math.max(100, Math.round(n)));
}

export const Route = createFileRoute("/scene")({
  validateSearch: (raw: Record<string, unknown>): SceneSearch => ({
    id:
      typeof raw.id === "string" && raw.id.length > 0 ? raw.id : undefined,
    w: parseSearchDimension(raw.w),
    h: parseSearchDimension(raw.h),
    name:
      typeof raw.name === "string" && raw.name.trim().length > 0
        ? raw.name.slice(0, 120)
        : undefined,
  }),
  component: ScenePage,
});

function ScenePage() {
  const { id, w, h, name } = Route.useSearch();
  const load = useSceneEditorStore((s) => s.load);
  const reset = useSceneEditorStore((s) => s.reset);
  const navigate = Route.useNavigate();

  // If no id yet, generate one and redirect — same pattern as /create.
  useLayoutEffect(() => {
    if (id) return;
    void navigate({
      to: "/scene",
      search: { id: crypto.randomUUID(), w, h },
      replace: true,
    });
  }, [id, w, h, navigate]);

  useEffect(() => {
    if (!id) return;
    void load(id, { w, h, name });
    return () => {
      reset();
    };
  }, [id, load, reset, w, h, name]);

  return <SceneEditorPage documentId={id ?? null} />;
}
