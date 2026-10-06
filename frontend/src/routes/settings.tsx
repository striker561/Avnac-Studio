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
  AiMagicIcon,
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

import type { HugeiconsProps } from "@hugeicons/react";

type SecretsBridge = {
  GetKey: (name: string) => Promise<string>;
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

type MCPBridge = {
  GetMCPInfo: () => Promise<MCPStateLike>;
  RegenerateToken: () => Promise<void>;
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
      ? "Could not load the saved key."
      : "Could not save the key.";
  }
  if (
    /window\.go|Cannot read properties of undefined|undefined is not an object|not a function/i.test(
      message,
    )
  ) {
    return "Secure key storage is only available inside the desktop app.";
  }
  return action === "load"
    ? `Could not load saved key: ${message}`
    : `Could not save key: ${message}`;
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
  error: string | null;
  notice: string | null;
}) {
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
          className="mb-2 block text-sm font-medium text-[var(--text)]"
        >
          API key
        </label>
        <input
          id={inputId}
          type="password"
          name={inputId}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full rounded-2xl border border-black/[0.1] bg-white px-4 text-[15px] text-[var(--text)] outline-none transition focus:border-black/[0.2] focus:ring-2 focus:ring-black/[0.08]"
          disabled={loading || saving}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--text)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSave}
            disabled={loading || saving}
          >
            {saving ? "Saving…" : "Save key"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-black/[0.12] bg-white px-6 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-black/[0.2] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClear}
            disabled={loading || saving}
          >
            Clear
          </button>
          {loading ? (
            <span className="text-sm text-[var(--text-muted)]">
              Loading saved key…
            </span>
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
    const [unsplashLoading, setUnsplashLoading] = useState(true);
    const [unsplashSaving, setUnsplashSaving] = useState(false);
    const [unsplashError, setUnsplashError] = useState<string | null>(null);
    const [unsplashNotice, setUnsplashNotice] = useState<string | null>(null);

    // --- Tambo key ---
    const [tamboKey, setTamboKey] = useState("");
    const [tamboLoading, setTamboLoading] = useState(true);
    const [tamboSaving, setTamboSaving] = useState(false);
    const [tamboError, setTamboError] = useState<string | null>(null);
    const [tamboNotice, setTamboNotice] = useState<string | null>(null);

    const [snapIntensity, setSnapIntensityState] = useState(() =>
      getSceneSnapIntensity(),
    );
    const [rotationSensitivity, setRotationSensitivityState] = useState(() =>
      getSceneRotationSensitivity(),
    );
    const [snapNotice, setSnapNotice] = useState<string | null>(null);
    const [rotationNotice, setRotationNotice] = useState<string | null>(null);
    const [developerMode, setDeveloperModeState] = useState(() =>
      getSceneDeveloperMode(),
    );
    const [developerNotice, setDeveloperNotice] = useState<string | null>(null);

    // --- MCP server ---
    const [mcpInfo, setMcpInfo] = useState<MCPStateLike | null>(null);
    const [mcpToken, setMcpToken] = useState("");
    const [mcpLoading, setMcpLoading] = useState(true);
    const [mcpBusy, setMcpBusy] = useState(false);
    const [mcpNotice, setMcpNotice] = useState<string | null>(null);
    const [mcpError, setMcpError] = useState<string | null>(null);

    const {
      currentVersion,
      updateAvailable,
      isChecking,
      lastChecked,
      checkNow,
    } = useUpdateCheck();

    // Load both keys on mount
    useEffect(() => {
      let cancelled = false;
      void (async () => {
        const bridge = getSecretsBridge();
        try {
          const key = bridge ? await bridge.GetKey("unsplash") : "";
          if (!cancelled) setUnsplashKey((key ?? "").trim());
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

    useEffect(() => {
      let cancelled = false;
      void (async () => {
        const bridge = getSecretsBridge();
        try {
          const key = bridge ? await bridge.GetKey("tambo") : "";
          if (!cancelled) setTamboKey((key ?? "").trim());
        } catch (err) {
          if (!cancelled) setTamboError(formatSecretsError(err, "load"));
        } finally {
          if (!cancelled) setTamboLoading(false);
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
          setUnsplashKey(next);
          setUnsplashNotice(
            next ? "Unsplash API key saved." : "Unsplash API key cleared.",
          );
        } catch (err) {
          setUnsplashError(formatSecretsError(err, "save"));
        } finally {
          setUnsplashSaving(false);
        }
      })();
    }, [unsplashKey]);

    const saveTamboKey = useCallback(() => {
      const next = tamboKey.trim();
      setTamboSaving(true);
      setTamboError(null);
      setTamboNotice(null);
      void (async () => {
        try {
          const bridge = getSecretsBridge();
          if (!bridge) throw new Error("Secrets bridge unavailable");
          await bridge.SetKey("tambo", next);
          setTamboKey(next);
          setTamboNotice(
            next ? "Tambo API key saved." : "Tambo API key cleared.",
          );
        } catch (err) {
          setTamboError(formatSecretsError(err, "save"));
        } finally {
          setTamboSaving(false);
        }
      })();
    }, [tamboKey]);

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
            setMcpNotice(
              next ? "Starting MCP server…" : "MCP server disabled.",
            );
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
                      ? "MCP server is running. Copy the connect URL and token below."
                      : (info.error ?? "MCP server did not start.")
                    : "MCP server disabled.",
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
          setMcpNotice("New token generated. Update your MCP client config.");
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
        .then(() => setMcpNotice(`${label} copied to clipboard.`))
        .catch(() => setMcpError("Could not copy — select the text manually."));
    }, []);

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
              <h1 className="display-title mb-4 text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.06] tracking-[-0.03em] text-[var(--text)]">
                Settings
              </h1>
              <p className="mb-12 max-w-xl text-lg leading-[1.6] text-[var(--text-muted)] sm:text-xl sm:leading-[1.55]">
                Configure integrations and preferences.
              </p>

              <div className="flex flex-col gap-6">
                {/* Tambo / Magic key */}
                <ApiKeyCard
                  icon={AiMagicIcon}
                  badge="Magic AI"
                  title="Tambo API key"
                  description="Powers the Magic AI chat panel. Get a free key at"
                  learnMoreHref="https://tambo.co"
                  learnMoreLabel="tambo.co"
                  inputId="avnac-tambo-key"
                  placeholder="Paste your Tambo API key"
                  value={tamboKey}
                  onChange={(v) => {
                    setTamboKey(v);
                    setTamboNotice(null);
                    setTamboError(null);
                  }}
                  onSave={saveTamboKey}
                  onClear={() => {
                    setTamboKey("");
                    setTamboNotice(null);
                    setTamboError(null);
                  }}
                  loading={tamboLoading}
                  saving={tamboSaving}
                  error={tamboError}
                  notice={tamboNotice}
                />

                {/* Unsplash key */}
                <ApiKeyCard
                  icon={Image01Icon}
                  badge="Images"
                  title="Unsplash API key"
                  description="Used for stock photo search inside the editor. Get a free key at"
                  learnMoreHref="https://unsplash.com/developers"
                  learnMoreLabel="unsplash.com/developers"
                  inputId="avnac-unsplash-key"
                  placeholder="Paste your Unsplash access key"
                  value={unsplashKey}
                  onChange={(v) => {
                    setUnsplashKey(v);
                    setUnsplashNotice(null);
                    setUnsplashError(null);
                  }}
                  onSave={saveUnsplashKey}
                  onClear={() => {
                    setUnsplashKey("");
                    setUnsplashNotice(null);
                    setUnsplashError(null);
                  }}
                  loading={unsplashLoading}
                  saving={unsplashSaving}
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
                        Lets local AI agents (Cursor, Claude Code, VS Code)
                        design on your canvas over Model Context Protocol. The
                        server only listens on this machine and requires a
                        bearer token.
                      </p>
                    </div>

                    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-black/[0.08] bg-white/85 px-4 py-3">
                      <div className="pr-4">
                        <p className="text-sm font-medium text-[var(--text)]">
                          Enable MCP server
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Off by default. Binds to 127.0.0.1 on a free port.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={mcpInfo?.enabled ?? false}
                        disabled={mcpLoading || mcpBusy || !getMCPBridge()}
                        onChange={(e) => toggleMCPServer(e.target.checked)}
                        className="size-4 shrink-0 rounded border border-black/20"
                        style={{ accentColor: "var(--accent)" }}
                      />
                    </label>

                    {mcpInfo?.enabled && mcpInfo.running ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.08] bg-white/85 px-4 py-3">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                            Connect URL
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-black/[0.04] px-3 py-2 text-[13px] text-[var(--text)]">
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
                            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-black/[0.04] px-3 py-2 text-[13px] text-[var(--text)]">
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
                            In your client config, set the URL above and send
                            header{" "}
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
                        Controls global stickiness for snapping and hit
                        heuristics.
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
                          setSnapNotice("Snap intensity updated.");
                        }}
                        aria-label="Snap intensity"
                        trackClassName="w-full"
                      />
                    </div>
                    {snapNotice ? (
                      <p className="text-sm text-emerald-700">{snapNotice}</p>
                    ) : null}
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
                        Controls how fast drag-to-rotate responds in the canvas.
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
                          setRotationNotice("Rotation speed updated.");
                        }}
                        aria-label="Rotation speed"
                        trackClassName="w-full"
                      />
                    </div>
                    {rotationNotice ? (
                      <p className="text-sm text-emerald-700">
                        {rotationNotice}
                      </p>
                    ) : null}
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
                        Hide the scene footer and technical diagnostics in the
                        editor.
                      </p>
                    </div>

                    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-black/[0.08] bg-white/85 px-4 py-3">
                      <div className="pr-4">
                        <p className="text-sm font-medium text-[var(--text)]">
                          Enable developer mode
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          When enabled, footer details are hidden on the scene
                          page.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={developerMode}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setDeveloperModeState(next);
                          setSceneDeveloperMode(next);
                          setDeveloperNotice(
                            next
                              ? "Developer mode enabled."
                              : "Developer mode disabled.",
                          );
                        }}
                        className="size-4 shrink-0 rounded border border-black/20"
                        style={{ accentColor: "var(--accent)" }}
                      />
                    </label>

                    {developerNotice ? (
                      <p className="text-sm text-emerald-700">
                        {developerNotice}
                      </p>
                    ) : null}
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
                        Current version:{" "}
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
                            {updateAvailable.latestVersion} is available
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
                            You&apos;re on {currentVersion}. Download the latest
                            release to get new features and fixes.
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
                    ) : lastChecked ? (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          size={16}
                          strokeWidth={1.75}
                          className="shrink-0 text-emerald-500"
                        />
                        You&apos;re up to date
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
                        Checking for updates…
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
