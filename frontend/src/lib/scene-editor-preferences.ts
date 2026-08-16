/**
 * Scene editor preferences — snap intensity and developer mode.
 *
 * Values are persisted to the native config JSON via the Wails ConfigManager
 * binding (avnacconfig.ConfigManager.Get / .Save). When running outside the
 * desktop app localStorage is used as an immediate-read cache and cross-tab
 * broadcast channel; the ConfigManager is used for durable persistence.
 */

const SNAP_INTENSITY_KEY = "avnac:scene:snap-intensity";
const DEVELOPER_MODE_KEY = "avnac:scene:developer-mode";
const SNAP_INTENSITY_EVENT = "avnac:scene-preferences";
const ROTATION_SENSITIVITY_EVENT = "avnac:scene-rotation-sensitivity";
const DEVELOPER_MODE_EVENT = "avnac:scene-developer-mode";

// ─── Wails bridge ─────────────────────────────────────────────────────────────

type ConfigBridge = {
  Get: () => Promise<{
    snap_intensity: number;
    developer_mode: boolean;
    rotation_sensitivity: number;
  }>;
  Save: (cfg: {
    snap_intensity?: number;
    developer_mode?: boolean;
    rotation_sensitivity?: number;
  }) => Promise<void>;
};

function getConfigBridge(): ConfigBridge | null {
  if (typeof window === "undefined") return null;
  const go = (
    window as Window & { go?: Record<string, Record<string, unknown>> }
  ).go;
  const mgr = go?.["avnacconfig"]?.["ConfigManager"] as
    | ConfigBridge
    | undefined;
  return mgr ?? null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

function clampRotationSensitivity(value: number): number {
  if (!Number.isFinite(value)) return 0.75;
  return Math.max(0.1, Math.min(1.5, value));
}

// ─── snap intensity ───────────────────────────────────────────────────────────

export function getSceneSnapIntensity(): number {
  if (typeof localStorage === "undefined") return 1;
  try {
    const raw = localStorage.getItem(SNAP_INTENSITY_KEY);
    if (raw == null) return 1;
    return clamp01(Number(raw));
  } catch {
    return 1;
  }
}

export function setSceneSnapIntensity(value: number): void {
  const next = clamp01(value);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(SNAP_INTENSITY_KEY, String(next));
    } catch {
      // Ignore localStorage failures.
    }
  }
  // Persist to native config (fire-and-forget).
  void (async () => {
    const bridge = getConfigBridge();
    if (!bridge) return;
    try {
      const current = await bridge.Get();
      await bridge.Save({ ...current, snap_intensity: next });
    } catch {
      /* ignore */
    }
  })();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<number>(SNAP_INTENSITY_EVENT, { detail: next }),
    );
  }
}

/**
 * Load snap intensity from the native config on startup and mirror it to
 * localStorage so getSceneSnapIntensity() stays in sync.
 * Falls back to localStorage if the bridge is unavailable.
 */
export async function loadSceneSnapIntensityFromConfig(): Promise<number> {
  const bridge = getConfigBridge();
  if (!bridge) return getSceneSnapIntensity();
  try {
    const cfg = await bridge.Get();
    const value = clamp01(cfg.snap_intensity ?? 1);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(SNAP_INTENSITY_KEY, String(value));
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<number>(SNAP_INTENSITY_EVENT, { detail: value }),
      );
    }
    return value;
  } catch {
    return getSceneSnapIntensity();
  }
}

export function onSceneSnapIntensityChange(
  listener: (value: number) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onLocalEvent = (event: Event) => {
    const custom = event as CustomEvent<number>;
    listener(clamp01(Number(custom.detail)));
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== SNAP_INTENSITY_KEY) return;
    listener(clamp01(Number(event.newValue ?? 1)));
  };

  window.addEventListener(SNAP_INTENSITY_EVENT, onLocalEvent as EventListener);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(
      SNAP_INTENSITY_EVENT,
      onLocalEvent as EventListener,
    );
    window.removeEventListener("storage", onStorage);
  };
}

// ─── rotation sensitivity ─────────────────────────────────────────────────────

export function getSceneRotationSensitivity(): number {
  return 0.75;
}

export function setSceneRotationSensitivity(value: number): void {
  const next = clampRotationSensitivity(value);
  // Persist to native config (fire-and-forget).
  void (async () => {
    const bridge = getConfigBridge();
    if (!bridge) return;
    try {
      const current = await bridge.Get();
      await bridge.Save({ ...current, rotation_sensitivity: next });
    } catch {
      /* ignore */
    }
  })();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<number>(ROTATION_SENSITIVITY_EVENT, { detail: next }),
    );
  }
}

export async function loadSceneRotationSensitivityFromConfig(): Promise<number> {
  const bridge = getConfigBridge();
  if (!bridge) return getSceneRotationSensitivity();
  try {
    const cfg = await bridge.Get();
    const value = clampRotationSensitivity(cfg.rotation_sensitivity ?? 0.75);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<number>(ROTATION_SENSITIVITY_EVENT, { detail: value }),
      );
    }
    return value;
  } catch {
    return getSceneRotationSensitivity();
  }
}

export function onSceneRotationSensitivityChange(
  listener: (value: number) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onLocalEvent = (event: Event) => {
    const custom = event as CustomEvent<number>;
    listener(clampRotationSensitivity(Number(custom.detail)));
  };

  window.addEventListener(
    ROTATION_SENSITIVITY_EVENT,
    onLocalEvent as EventListener,
  );

  return () => {
    window.removeEventListener(
      ROTATION_SENSITIVITY_EVENT,
      onLocalEvent as EventListener,
    );
  };
}

// ─── developer mode ───────────────────────────────────────────────────────────

function getStoredDeveloperModeValue(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(DEVELOPER_MODE_KEY);
  } catch {
    return null;
  }
}

export function getSceneDeveloperMode(): boolean {
  const stored = getStoredDeveloperModeValue();
  // Developer mode (render-stats bar) is ON by default for all users until
  // they explicitly turn it off.
  if (stored === null) return true;
  return stored === "1";
}

export function setSceneDeveloperMode(value: boolean): void {
  const next = Boolean(value);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(DEVELOPER_MODE_KEY, next ? "1" : "0");
    } catch {
      // Ignore localStorage failures.
    }
  }
  // Persist to native config (fire-and-forget).
  void (async () => {
    const bridge = getConfigBridge();
    if (!bridge) return;
    try {
      const current = await bridge.Get();
      await bridge.Save({ ...current, developer_mode: next });
    } catch {
      /* ignore */
    }
  })();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<boolean>(DEVELOPER_MODE_EVENT, { detail: next }),
    );
  }
}

/**
 * Load developer mode from the native config on startup and mirror it to
 * localStorage. Falls back to localStorage if the bridge is unavailable.
 */
export async function loadSceneDeveloperModeFromConfig(): Promise<boolean> {
  const bridge = getConfigBridge();
  if (!bridge) return getSceneDeveloperMode();
  try {
    const cfg = await bridge.Get();
    // A stored preference is the user's explicit choice and wins. Otherwise
    // default developer mode ON — the config's Go zero-value `false` can't
    // distinguish "off" from "not set", so we don't trust it as an off signal.
    const stored = getStoredDeveloperModeValue();
    const value = stored !== null ? stored === "1" : true;
    void cfg;
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(DEVELOPER_MODE_KEY, value ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<boolean>(DEVELOPER_MODE_EVENT, { detail: value }),
      );
    }
    return value;
  } catch {
    return getSceneDeveloperMode();
  }
}

export function onSceneDeveloperModeChange(
  listener: (value: boolean) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onLocalEvent = (event: Event) => {
    const custom = event as CustomEvent<boolean>;
    listener(Boolean(custom.detail));
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== DEVELOPER_MODE_KEY) return;
    listener(event.newValue === "1");
  };

  window.addEventListener(DEVELOPER_MODE_EVENT, onLocalEvent as EventListener);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(
      DEVELOPER_MODE_EVENT,
      onLocalEvent as EventListener,
    );
    window.removeEventListener("storage", onStorage);
  };
}
