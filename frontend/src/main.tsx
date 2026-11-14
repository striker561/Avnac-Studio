import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import { scheduleAppChromeFonts } from "./lib/load-google-font";
import { mountShellStatusResponder } from "./lib/mcp/shell-status-responder";
import "./styles.css";

// Suppress the browser/WebView2 context menu everywhere — this is a desktop
// app and the native menu would expose Inspect, Reload, Save as, etc.
// document.addEventListener('contextmenu', (e) => e.preventDefault())

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// MCP tool actions are subscribed by useMCPActions() in routes/__root.tsx.
// The shell answers client_status on its own, so Settings can check the running
// build with no design open.
mountShellStatusResponder();

scheduleAppChromeFonts();

