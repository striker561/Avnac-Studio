import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import NativeTitleTooltip from "../components/native-title-tooltip";
import {
  loadSceneDeveloperModeFromConfig,
  loadSceneSnapIntensityFromConfig,
} from "@/lib/scene-editor-preferences";
import { useMCPActions } from "@/features/scene-editor/use-mcp-actions";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useMCPActions();

  // Load persisted preferences from native config as soon as the Wails bridge
  // is ready. Dispatches change events so all subscribers (scene editor store,
  // settings page) pick up the correct values without polling.
  useEffect(() => {
    void loadSceneSnapIntensityFromConfig();
    void loadSceneDeveloperModeFromConfig();
  }, []);

  return (
    <>
      <NativeTitleTooltip />
      <Outlet />
    </>
  );
}
