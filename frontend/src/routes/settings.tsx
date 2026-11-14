import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";
import {
  ArrowLeft01Icon,
  Image01Icon,
  ArrowReloadHorizontalIcon,
  CheckmarkCircle01Icon,
  AlertDiamondIcon,
  BotIcon,
  Copy01Icon,
} from "@hugeicons/core-free-icons";
import EditorRangeSlider from "@/components/editor/shared/editor-range-slider";
import {
  getSceneDeveloperMode,
  getSceneRotationSensitivity,
  getSceneSnapIntensity,
  loadSceneDeveloperModeFromConfig,
  loadSceneRotationSensitivityFromConfig,
  loadSceneSnapIntensityFromConfig,
  onSceneDeveloperModeChange,
  onSceneRotationSensitivityChange,
  onSceneSnapIntensityChange,
  setSceneDeveloperMode,
  setSceneRotationSensitivity,
  setSceneSnapIntensity,
} from "@/lib/scene-editor-preferences";
import { useUpdateCheck } from "../lib/use-update-check";
import { getMCPClientId } from "@/lib/mcp/transport";

import type { HugeiconsProps } from "@hugeicons/react";

type SecretsBridge = {
  GetKey: (name: string) => Promise<string>;
  HasKey: (name: string) => Promise<boolean>;
  SetKey: (name: string, value: string) => Promise<void>;
  DeleteKey: (name: string) => Promise<void>;
};

function getSecretsBridge(): SecretsBridge | null {
  if (typeof window === "undefined") return null;
  const go = (
    window as Window & { go?: Record<string, Record<string, unknown>> }
  ).go;
  const mgr = go?.["avnacsecrets"]?.["SecretsManager"] as
    | SecretsBridge
    | undefined;
  return mgr ?? null;
}

type MCPStateLike = {
  enabled: boolean;
  running: boolean;
  port: number;
  url: string;
  sse_url: string;
  error?: string;
};

type MCPToolSurfaceOp = {
  op: string;
  action?: string;
  client: boolean;
};

type MCPToolSurfaceTool = {
  name: string;
  description: string;
  ops?: MCPToolSurfaceOp[];
  action?: string;
};

type MCPToolSurface = {
  tools: MCPToolSurfaceTool[];
  toolCount: number;
  opCount: number;
  generatedAt: string;
  fingerprint: string;
  clientActions: string[];
};

type MCPClientCheck = {
  answered: boolean;
  clientId?: string;
  actionHandlerId?: string;
  revision: number;
  document?: string;
  actions: string[];
  missing: string[];
  expected: string[];
  latencyMs: number;
  stale: boolean;
  message: string;
  error?: string;
};

type MCPBridge = {
  GetMCPInfo: () => Promise<MCPStateLike>;
  RegenerateToken: () => Promise<void>;
  ToolSurface?: () => Promise<MCPToolSurface>;
  CheckClient?: () => Promise<MCPClientCheck>;
};

function getMCPBridge(): MCPBridge | null {
  if (typeof window === "undefined") return null;
  const go = (
    window as Window & { go?: Record<string, Record<string, unknown>> }
  ).go;
  const bridge = go?.["mcp"]?.["AvnacMCP"] as MCPBridge | undefined;
  return bridge ?? null;
}

type FullConfigBridge = {
  Get: () => Promise<Record<string, unknown>>;
  Save: (cfg: Record<string, unknown>) => Promise<void>;
};

function getFullConfigBridge(): FullConfigBridge | null {
  if (typeof window === "undefined") return null;
  const go = (
    window as Window & { go?: Record<string, Record<string, unknown>> }
  ).go;
  const bridge = go?.["avnacconfig"]?.["ConfigManager"] as
    | FullConfigBridge
    | undefined;
  return bridge ?? null;
}

function formatSecretsError(error: unknown, action: "load" | "save"): string {
  const message =
    error instanceof Error ? error.message.trim() : String(error ?? "").trim();
  if (!message) {
    return action === "load"
      ? "Couldn't load the saved key."
      : "Couldn't save the key.";
  }
  if (
    /window\.go|Cannot read properties of undefined|undefined is not an object|not a function/i.test(
      message,
    )
  ) {
    return "Key storage needs the desktop app.";
  }
  return action === "load"
    ? `Couldn't load saved key: ${message}`
    : `Couldn't save key: ${message}`;
}

/** On/off switch used by the settings toggles */
function SettingSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel,
  describedBy,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[var(--accent)]" : "bg-black/[0.16]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm ring-1 ring-black/[0.06] transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/** Reusable card for a single API key field */
function ApiKeyCard({
  icon,
  badge,
  title,
  description,
  inputId,
  placeholder,
  learnMoreHref,
  learnMoreLabel,
  value,
  onChange,
  onSave,
  onClear,
  loading,
  saving,
  hasSavedKey,
  error,
  notice,
}: {
  icon: NonNullable<HugeiconsProps["icon"]>;
  badge: string;
  title: string;
  description: string;
  inputId: string;
  placeholder: string;
  learnMoreHref: string;
  learnMoreLabel: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onClear: () => void;
  loading: boolean;
  saving: boolean;
  hasSavedKey: boolean;
  error: string | null;
  notice: string | null;
}) {
  const [focused, setFocused] = useState(false);
  // Saved keys show as content, not a placeholder — the field looks filled,
  // and focusing it swaps in an empty box to type a replacement.
  const maskSaved = hasSavedKey && value === "";
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/75 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-md">
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
            <HugeiconsIcon
              icon={icon}
              size={14}
              strokeWidth={1.9}
              className="shrink-0"
            />
            {badge}
          </div>
          <h2 className="m-0 text-base font-semibold text-[var(--text)] sm:text-lg">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            {description}{" "}
            <button
              type="button"
              onClick={() => BrowserOpenURL(learnMoreHref)}
              className="font-medium underline decoration-dotted underline-offset-2 cursor-pointer"
            >
              {learnMoreLabel}
            </button>
          </p>
        </div>
      </div>

      <div className="border-t border-black/[0.06] px-5 py-5 sm:px-6">
        <label
          htmlFor={inputId}
          className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text)]"
        >
          API key
          {hasSavedKey ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              Saved
            </span>
          ) : null}
        </label>
        <input
          id={inputId}
          type={maskSaved && !focused ? "text" : "password"}
          name={inputId}
          value={maskSaved && !focused ? "••••••••" : value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full rounded-2xl border border-black/[0.1] bg-white px-4 text-[15px] tracking-[0.12em] text-[var(--text)] outline-none transition focus:border-black/[0.2] focus:ring-2 focus:ring-black/[0.08]"
          disabled={loading || saving}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--text)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSave}
            disabled={loading || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-black/[0.12] bg-white px-6 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-black/[0.2] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClear}
            disabled={loading || saving || (!hasSavedKey && value === "")}
          >
            Clear
          </button>
          {loading ? (
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          ) : null}
        </div>
        {notice ? (
          <p className="mt-3 text-sm text-emerald-700">{notice}</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: function SettingsPage() {
    // --- Unsplash key ---
    const [unsplashKey, setUnsplashKey] = useState("");
    const [unsplashSaved, setUnsplashSaved] = useState(false);
    const [unsplashLoading, setUnsplashLoading] = useState(true);
    const [unsplashSaving, setUnsplashSaving] = useState(false);
    const [unsplashError, setUnsplashError] = useState<string | null>(null);
    const [unsplashNotice, setUnsplashNotice] = useState<string | null>(null);

    const [snapIntensity, setSnapIntensityState] = useState(() =>
      getSceneSnapIntensity(),
    );
    const [rotationSensitivity, setRotationSensitivityState] = useState(() =>
      getSceneRotationSensitivity(),
    );
    const [developerMode, setDeveloperModeState] = useState(() =>
      getSceneDeveloperMode(),
    );

    // --- MCP server ---
    const [mcpInfo, setMcpInfo] = useState<MCPStateLike | null>(null);
    const [mcpToken, setMcpToken] = useState("");
    const [mcpLoading, setMcpLoading] = useState(true);
    const [mcpBusy, setMcpBusy] = useState(false);
    const [mcpNotice, setMcpNotice] = useState<string | null>(null);
    const [mcpError, setMcpError] = useState<string | null>(null);

    // --- MCP tool surface ---
    const [surface, setSurface] = useState<MCPToolSurface | null>(null);
    const [clientCheck, setClientCheck] = useState<MCPClientCheck | null>(null);
    const [surfaceLoading, setSurfaceLoading] = useState(false);
    const [surfaceError, setSurfaceError] = useState<string | null>(null);
    // This window's own id, so a check answered by another page is visible.
    const [ownClientId] = useState(() => getMCPClientId());

    const {
      currentVersion,
      updateAvailable,
      isChecking,
      lastChecked,
      checkError,
      checkNow,
    } = useUpdateCheck();

    // The backend only reports whether a key is stored — it never hands the
    // value back, so the saved key's length is not exposed in the UI.
    useEffect(() => {
      let cancelled = false;
      void (async () => {
        const bridge = getSecretsBridge();
        try {
          const saved = bridge ? await bridge.HasKey("unsplash") : false;
          if (!cancelled) setUnsplashSaved(saved);
        } catch (err) {
          if (!cancelled) setUnsplashError(formatSecretsError(err, "load"));
        } finally {
          if (!cancelled) setUnsplashLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    const saveUnsplashKey = useCallback(() => {
      const next = unsplashKey.trim();
      setUnsplashSaving(true);
      setUnsplashError(null);
      setUnsplashNotice(null);
      void (async () => {
        try {
          const bridge = getSecretsBridge();
          if (!bridge) throw new Error("Secrets bridge unavailable");
          await bridge.SetKey("unsplash", next);
          setUnsplashKey("");
          setUnsplashSaved(next.length > 0);
          setUnsplashNotice(
            next ? "Saved" : "Cleared",
          );
        } catch (err) {
          setUnsplashError(formatSecretsError(err, "save"));
        } finally {
          setUnsplashSaving(false);
        }
      })();
    }, [unsplashKey]);

    const clearUnsplashKey = useCallback(() => {
      setUnsplashSaving(true);
      setUnsplashError(null);
      setUnsplashNotice(null);
      void (async () => {
        try {
          const bridge = getSecretsBridge();
          if (!bridge) throw new Error("Secrets bridge unavailable");
          await bridge.DeleteKey("unsplash");
          setUnsplashKey("");
          setUnsplashSaved(false);
          setUnsplashNotice("Cleared");
        } catch (err) {
          setUnsplashError(formatSecretsError(err, "save"));
        } finally {
          setUnsplashSaving(false);
        }
      })();
    }, []);

    useEffect(() => {
      return onSceneSnapIntensityChange((value) => {
        setSnapIntensityState(value);
      });
    }, []);

    useEffect(() => {
      return onSceneRotationSensitivityChange((value) => {
        setRotationSensitivityState(value);
      });
    }, []);

    // Load persisted values from native config on mount.
    useEffect(() => {
      void loadSceneSnapIntensityFromConfig().then((v) =>
        setSnapIntensityState(v),
      );
      void loadSceneRotationSensitivityFromConfig().then((v) =>
        setRotationSensitivityState(v),
      );
      void loadSceneDeveloperModeFromConfig().then((v) =>
        setDeveloperModeState(v),
      );
    }, []);

    useEffect(() => {
      return onSceneDeveloperModeChange((value) => {
        setDeveloperModeState(value);
      });
    }, []);

    // --- MCP server: load status and token on mount ---
    useEffect(() => {
      let cancelled = false;
      const refresh = async () => {
        const bridge = getMCPBridge();
        if (!bridge) {
          if (!cancelled) setMcpLoading(false);
          return;
        }
        try {
          const info = await bridge.GetMCPInfo();
          if (cancelled) return;
          setMcpInfo(info);
          const secrets = getSecretsBridge();
          const tok = secrets ? await secrets.GetKey("mcp") : "";
          if (!cancelled) setMcpToken((tok ?? "").trim());
        } catch (err) {
          if (!cancelled) setMcpError(formatSecretsError(err, "load"));
        } finally {
          if (!cancelled) setMcpLoading(false);
        }
      };
      void refresh();
      return () => {
        cancelled = true;
      };
    }, []);

    const toggleMCPServer = useCallback(
      (next: boolean) => {
        setMcpBusy(true);
        setMcpError(null);
        setMcpNotice(null);
        void (async () => {
          try {
            const cfgBridge = getFullConfigBridge();
            if (!cfgBridge) throw new Error("Config bridge unavailable");
            const current = await cfgBridge.Get();
            await cfgBridge.Save({ ...current, mcp_enabled: next });
            setMcpNotice(next ? "Starting…" : "Disabled.");
            // The Go watcher restarts the listener; re-read the state once
            // it has settled so the connect URL is fresh.
            setTimeout(() => {
              const bridge = getMCPBridge();
              if (!bridge) return;
              void bridge.GetMCPInfo().then((info) => {
                setMcpInfo(info);
                setMcpNotice(
                  next
                    ? info.running
                      ? "Running. Copy the URL and token below."
                      : (info.error ?? "Didn't start.")
                    : "Disabled.",
                );
              });
            }, 700);
          } catch (err) {
            setMcpError(formatSecretsError(err, "save"));
          } finally {
            setMcpBusy(false);
          }
        })();
      },
      [],
    );

    const regenerateMCPToken = useCallback(() => {
      setMcpBusy(true);
      setMcpError(null);
      setMcpNotice(null);
      void (async () => {
        try {
          const bridge = getMCPBridge();
          if (!bridge) throw new Error("MCP bridge unavailable");
          await bridge.RegenerateToken();
          const secrets = getSecretsBridge();
          const tok = secrets ? await secrets.GetKey("mcp") : "";
          setMcpToken((tok ?? "").trim());
          setMcpNotice("New token. Update your client config.");
        } catch (err) {
          setMcpError(formatSecretsError(err, "save"));
        } finally {
          setMcpBusy(false);
        }
      })();
    }, []);

    const copyToClipboard = useCallback((text: string, label: string) => {
      void navigator.clipboard
        .writeText(text)
        .then(() => setMcpNotice(`${label} copied.`))
        .catch(() => setMcpError("Couldn't copy. Select the text."));
    }, []);

    /**
     * Read the Go tool surface and ask the open editor window to list the
     * actions it can dispatch. Both share one Refresh because the comparison is
     * the point: a window running an older bundle answers "Unknown action" for
     * anything added since it loaded, which looks like a broken tool.
     */
    const refreshSurface = useCallback(async () => {
      const bridge = getMCPBridge();
      if (!bridge?.ToolSurface) {
        setSurfaceError(
          "This app predates the panel. Rebuild and relaunch.",
        );
        return;
      }
      setSurfaceLoading(true);
      setSurfaceError(null);
      try {
        setSurface(await bridge.ToolSurface());
        setClientCheck(bridge.CheckClient ? await bridge.CheckClient() : null);
      } catch (err) {
        setSurfaceError(
          err instanceof Error && err.message.trim()
            ? err.message
            : "Couldn't read the tool surface.",
        );
      } finally {
        setSurfaceLoading(false);
      }
    }, []);

    useEffect(() => {
      if (!getMCPBridge()?.ToolSurface) return;
      void refreshSurface();
    }, [refreshSurface]);

    // Go marshals empty slices as null on older builds; the panel must not
    // assume arrays here (a null crashed the whole settings route).
    const missingActions = clientCheck?.missing ?? [];

    return (
      <main className="hero-page relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
        <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />

        <div className="relative z-[1] flex flex-1 flex-col">
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] pt-4 sm:pt-5">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-start gap-3 px-5 sm:px-8 pointer-events-auto">
              <Link
                to="/files"
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/[0.12] bg-white/85 px-6 py-2.5 text-[15px] font-medium text-[var(--text)] transition hover:border-black/[0.2] hover:bg-white sm:min-h-12 sm:px-8 sm:py-3 sm:text-[1.0625rem]"
              >
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  size={18}
                  strokeWidth={1.75}
                  className="shrink-0"
                />
                Files
              </Link>
            </div>
          </div>

          <div className="shrink-0 pt-4 sm:pt-5" aria-hidden>
            <div className="mx-auto flex h-11 w-full max-w-6xl justify-end px-5 sm:h-12 sm:px-8" />
          </div>

          <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
            <div className="rise-in">
              <h1 className="display-title mb-12 text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.06] tracking-[-0.03em] text-[var(--text)]">
                Settings
              </h1>

              <div className="flex flex-col gap-6">
                {/* Unsplash key */}
                <ApiKeyCard
                  icon={Image01Icon}
                  badge="Images"
                  title="Unsplash API key"
                  description="Stock photo search in the editor. Free key at"
                  learnMoreHref="https://unsplash.com/developers"
                  learnMoreLabel="unsplash.com/developers"
                  inputId="avnac-unsplash-key"
                  placeholder="Access key"
                  value={unsplashKey}
                  onChange={(v) => {
                    setUnsplashKey(v);
                    setUnsplashNotice(null);
                    setUnsplashError(null);
                  }}
                  onSave={saveUnsplashKey}
                  onClear={clearUnsplashKey}
                  loading={unsplashLoading}
                  saving={unsplashSaving}
                  hasSavedKey={unsplashSaved}
                  error={unsplashError}
                  notice={unsplashNotice}
                />

                {/* MCP design server */}
                <div className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/75 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-md">
                  <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                        <HugeiconsIcon
                          icon={BotIcon}
                          size={14}
                          strokeWidth={1.9}
                          className="shrink-0"
                        />
                        AI Agents
                      </div>
                      <h2 className="m-0 text-base font-semibold text-[var(--text)] sm:text-lg">
                        MCP design server
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Local AI agents (Cursor, Claude Code, VS Code) edit the
                        canvas over MCP. Listens on this machine only; bearer
                        token required.
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-black/[0.08] bg-white/85 px-4 py-3">
                      <div className="pr-4">
                        <p className="text-sm font-medium text-[var(--text)]">
                          Enable MCP server
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Binds to 127.0.0.1 on a fixed port; falls back to a
                          free one.
                        </p>
                      </div>
                      <SettingSwitch
                        ariaLabel="Enable MCP server"
                        checked={mcpInfo?.enabled ?? false}
                        disabled={mcpLoading || mcpBusy || !getMCPBridge()}
                        onChange={toggleMCPServer}
                      />
                    </div>

                    {mcpInfo?.enabled && mcpInfo.running ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.08] bg-white/85 px-4 py-3">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                            Connect URL
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="min-w-0 flex-1 break-all rounded-xl bg-black/[0.04] px-3 py-2 text-[13px] text-[var(--text)]">
                              {mcpInfo.url}
                            </code>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(mcpInfo.url, "Connect URL")
                              }
                              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/[0.12] bg-white text-[var(--text)] transition hover:border-black/[0.2]"
                              aria-label="Copy connect URL"
                            >
                              <HugeiconsIcon
                                icon={Copy01Icon}
                                size={15}
                                strokeWidth={1.9}
                              />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                            Bearer token
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="min-w-0 flex-1 break-all rounded-xl bg-black/[0.04] px-3 py-2 text-[13px] text-[var(--text)]">
                              {mcpToken || "…"}
                            </code>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(mcpToken, "Bearer token")
                              }
                              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/[0.12] bg-white text-[var(--text)] transition hover:border-black/[0.2]"
                              aria-label="Copy bearer token"
                            >
                              <HugeiconsIcon
                                icon={Copy01Icon}
                                size={15}
                                strokeWidth={1.9}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={regenerateMCPToken}
                              disabled={mcpBusy}
                              className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/[0.12] bg-white px-3 text-xs font-medium text-[var(--text)] transition hover:border-black/[0.2] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Regenerate
                            </button>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                            In your client config, send header{" "}
                            <code className="rounded bg-black/[0.05] px-1 py-0.5 text-[11px]">
                              Authorization: Bearer &lt;token&gt;
                            </code>
                            .
                          </p>
                        </div>
                      </div>
                    ) : mcpInfo?.enabled && mcpInfo.error ? (
                      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                        <HugeiconsIcon
                          icon={AlertDiamondIcon}
                          size={16}
                          strokeWidth={1.9}
                          className="mt-0.5 shrink-0 text-amber-500"
                        />
                        <p className="text-sm text-amber-800">
                          {mcpInfo.error}
                        </p>
                      </div>
                    ) : null}

                    {mcpNotice ? (
                      <p className="text-sm text-emerald-700">{mcpNotice}</p>
                    ) : null}
                    {mcpError ? (
                      <p className="text-sm text-red-600">{mcpError}</p>
                    ) : null}
                  </div>
                </div>

                {/* MCP tool surface */}
                <div className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/75 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-md">
                  <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                          <HugeiconsIcon
                            icon={BotIcon}
                            size={14}
                            strokeWidth={1.9}
                            className="shrink-0"
                          />
                          AI Agents
                        </div>
                        <h2 className="m-0 text-base font-semibold text-[var(--text)] sm:text-lg">
                          MCP tool surface
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                          What this build publishes and what the open window can
                          dispatch. Refresh after a rebuild; an older bundle
                          shows up here instead of as “Unknown action”.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void refreshSurface()}
                        disabled={surfaceLoading}
                        className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/[0.12] bg-white px-3 text-xs font-medium text-[var(--text)] transition hover:border-black/[0.2] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <HugeiconsIcon
                          icon={ArrowReloadHorizontalIcon}
                          size={15}
                          strokeWidth={1.9}
                          className={surfaceLoading ? "animate-spin" : ""}
                        />
                        Refresh
                      </button>
                    </div>

                    {clientCheck ? (
                      <div
                        className={`rounded-2xl border px-4 py-3 ${
                          clientCheck.stale
                            ? "border-amber-200 bg-amber-50/80"
                            : "border-emerald-200 bg-emerald-50/70"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <HugeiconsIcon
                            icon={
                              clientCheck.stale
                                ? AlertDiamondIcon
                                : CheckmarkCircle01Icon
                            }
                            size={16}
                            strokeWidth={1.9}
                            className={`mt-0.5 shrink-0 ${
                              clientCheck.stale
                                ? "text-amber-500"
                                : "text-emerald-600"
                            }`}
                          />
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                clientCheck.stale
                                  ? "text-amber-800"
                                  : "text-emerald-800"
                              }`}
                            >
                              {clientCheck.stale
                                ? "Window needs a reload"
                                : "Window is current"}
                            </p>
                            <p
                              className={`mt-1 text-xs leading-5 ${
                                clientCheck.stale
                                  ? "text-amber-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {clientCheck.message}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                              {clientCheck.answered
                                ? `client ${clientCheck.clientId?.slice(0, 8) ?? "?"} · handler ${clientCheck.actionHandlerId?.slice(0, 8) ?? "?"} · revision ${clientCheck.revision}`
                                : "no client answered"}{" "}
                              · {clientCheck.latencyMs} ms · this window{" "}
                              {ownClientId.slice(0, 8)}
                            </p>
                            {clientCheck.answered &&
                            clientCheck.clientId &&
                            clientCheck.clientId !== ownClientId ? (
                              <p className="mt-2 text-[11px] leading-5 text-amber-700">
                                Another window answered. A second copy of the app
                                (browser tab or window) can win the tool-call
                                race. Close it, then refresh.
                              </p>
                            ) : null}
                            {missingActions.length > 0 ? (
                              <p className="mt-2 break-all text-[11px] leading-5 text-red-700">
                                missing: {missingActions.slice(0, 12).join(", ")}
                                {missingActions.length > 12
                                  ? ` +${missingActions.length - 12} more`
                                  : ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {surface ? (
                      <div className="rounded-2xl border border-black/[0.08] bg-white/85">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-black/[0.06] px-4 py-2 text-xs text-[var(--text-muted)]">
                          <span>
                            <strong className="font-semibold text-[var(--text)]">
                              {surface.toolCount}
                            </strong>{" "}
                            tools
                          </span>
                          <span>
                            <strong className="font-semibold text-[var(--text)]">
                              {surface.opCount}
                            </strong>{" "}
                            ops
                          </span>
                          <span>
                            fingerprint{" "}
                            <code className="rounded bg-black/[0.05] px-1 py-0.5 text-[11px]">
                              {surface.fingerprint}
                            </code>
                          </span>
                          <span className="ml-auto">
                            read{" "}
                            {new Date(surface.generatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="max-h-80 overflow-auto px-4 py-1">
                          {surface.tools.map((tool) => (
                            <div
                              key={tool.name}
                              className="border-b border-black/[0.05] py-2 last:border-b-0"
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <code className="text-[13px] font-medium text-[var(--text)]">
                                  {tool.name}
                                </code>
                                {tool.action ? (
                                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                                    {tool.action}
                                  </span>
                                ) : null}
                              </div>
                              {tool.description ? (
                                <p className="mt-0.5 text-[12px] leading-5 text-[var(--text-muted)]">
                                  {tool.description}
                                </p>
                              ) : null}
                              {tool.ops && tool.ops.length > 0 ? (
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {tool.ops.map((op) => {
                                    const missing =
                                      op.client &&
                                      Boolean(
                                        op.action &&
                                          missingActions.includes(op.action),
                                      );
                                    return (
                                      <span
                                        key={op.op}
                                        title={
                                          op.action
                                            ? `emits ${op.action}`
                                            : "answered in Go"
                                        }
                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                                          missing
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : op.client
                                              ? "border-black/[0.08] bg-white text-[var(--text)]"
                                              : "border-black/[0.06] bg-black/[0.03] text-[var(--text-muted)]"
                                        }`}
                                      >
                                        <span
                                          className={`size-1.5 rounded-full ${
                                            missing
                                              ? "bg-red-500"
                                              : op.client
                                                ? "bg-emerald-500"
                                                : "bg-black/20"
                                          }`}
                                        />
                                        {op.op}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : surfaceLoading ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        Reading…
                      </p>
                    ) : null}

                    {surfaceError ? (
                      <p className="text-sm text-red-600">{surfaceError}</p>
                    ) : null}
                  </div>
                </div>

                {/* Scene snap intensity */}
                <div className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/75 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-md">
                  <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                        Scene
                      </div>
                      <h2 className="m-0 text-base font-semibold text-[var(--text)] sm:text-lg">
                        Snap Intensity
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        How sticky snapping and hit-testing are.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/[0.08] bg-white/85 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between text-sm text-[var(--text-muted)]">
                        <span>0.00</span>
                        <span className="font-medium text-[var(--text)]">
                          {snapIntensity.toFixed(2)}
                        </span>
                        <span>1.00</span>
                      </div>
                      <EditorRangeSlider
                        min={0}
                        max={1}
                        step={0.01}
                        value={snapIntensity}
                        onChange={(value) => {
                          const next = Math.max(0, Math.min(1, value));
                          setSnapIntensityState(next);
                          setSceneSnapIntensity(next);
                        }}
                        aria-label="Snap intensity"
                        trackClassName="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Scene rotation sensitivity */}
                <div className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/75 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-md">
                  <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                        Scene
                      </div>
                      <h2 className="m-0 text-base font-semibold text-[var(--text)] sm:text-lg">
                        Rotation Speed
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Drag-to-rotate responsiveness.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/[0.08] bg-white/85 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between text-sm text-[var(--text-muted)]">
                        <span>0.10</span>
                        <span className="font-medium text-[var(--text)]">
                          {rotationSensitivity.toFixed(2)}
                        </span>
                        <span>1.50</span>
                      </div>
                      <EditorRangeSlider
                        min={0.1}
                        max={1.5}
                        step={0.01}
                        value={rotationSensitivity}
                        onChange={(value) => {
                          const next = Math.max(0.1, Math.min(1.5, value));
                          setRotationSensitivityState(next);
                          setSceneRotationSensitivity(next);
                        }}
                        aria-label="Rotation speed"
                        trackClassName="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Developer mode */}
                <div className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/75 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-md">
                  <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                        Advanced
                      </div>
                      <h2 className="m-0 text-base font-semibold text-[var(--text)] sm:text-lg">
                        Developer Mode
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Hides the scene footer and diagnostics.
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-black/[0.08] bg-white/85 px-4 py-3">
                      <div className="pr-4">
                        <p className="text-sm font-medium text-[var(--text)]">
                          Developer mode
                        </p>
                      </div>
                      <SettingSwitch
                        ariaLabel="Enable developer mode"
                        checked={developerMode}
                        onChange={(next) => {
                          setDeveloperModeState(next);
                          setSceneDeveloperMode(next);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Updates section */}
                <div className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/75 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-md">
                  <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                        <HugeiconsIcon
                          icon={ArrowReloadHorizontalIcon}
                          size={14}
                          strokeWidth={1.9}
                          className="shrink-0"
                        />
                        App
                      </div>
                      <h2 className="m-0 text-base font-semibold text-[var(--text)] sm:text-lg">
                        Updates
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Version{" "}
                        <span className="font-medium text-[var(--text)]">
                          {currentVersion ?? "…"}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/[0.12] bg-white px-5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-black/[0.2] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={checkNow}
                      disabled={isChecking}
                    >
                      <HugeiconsIcon
                        icon={ArrowReloadHorizontalIcon}
                        size={15}
                        strokeWidth={1.9}
                        className={isChecking ? "animate-spin" : ""}
                      />
                      {isChecking ? "Checking…" : "Check for updates"}
                    </button>
                  </div>

                  <div className="border-t border-black/[0.06] px-5 py-4 sm:px-6">
                    {updateAvailable ? (
                      <div className="flex items-start gap-3">
                        <HugeiconsIcon
                          icon={AlertDiamondIcon}
                          size={18}
                          strokeWidth={1.75}
                          className="mt-0.5 shrink-0 text-amber-500"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text)]">
                            {updateAvailable.latestVersion} available
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
                            You&apos;re on {currentVersion}.
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              BrowserOpenURL(
                                "https://avnac.design/studio#platform-downloads",
                              )
                            }
                            className="mt-3 inline-flex h-9 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--text)] px-5 text-xs font-medium text-white transition hover:bg-[#262626]"
                          >
                            Download {updateAvailable.latestVersion}
                          </button>
                        </div>
                      </div>
                    ) : checkError ? (
                      <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                        <HugeiconsIcon
                          icon={AlertDiamondIcon}
                          size={16}
                          strokeWidth={1.75}
                          className="mt-0.5 shrink-0 text-amber-500"
                        />
                        <span>
                          Couldn&apos;t check for updates.
                          <span className="block text-xs text-[var(--text-muted)]">
                            {checkError}
                          </span>
                        </span>
                      </div>
                    ) : lastChecked ? (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          size={16}
                          strokeWidth={1.75}
                          className="shrink-0 text-emerald-500"
                        />
                        Up to date
                        <span className="text-xs">
                          · checked{" "}
                          {lastChecked.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--text-muted)]">
                        Checking…
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  },
});
