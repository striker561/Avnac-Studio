import { useCallback, useEffect, useRef, useState } from "react";
import { GetVersion } from "../../wailsjs/go/main/App";

const GITHUB_REPO = "striker561/Avnac-Studio";
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const DOWNLOAD_URL =
  "https://github.com/striker561/Avnac-Studio#%EF%B8%8F-download";

export type UpdateInfo = {
  latestVersion: string;
  releaseUrl: string;
  publishedAt: string;
  downloadUrl: string;
};

export type UseUpdateCheckResult = {
  currentVersion: string | null;
  updateAvailable: UpdateInfo | null;
  isChecking: boolean;
  lastChecked: Date | null;
  checkError: string | null;
  checkNow: () => void;
  dismiss: () => void;
};

function isStableVersion(v: string): boolean {
  return (
    !v.endsWith("-dev") && !v.endsWith("-beta") && !v.endsWith("-alpha")
  );
}

async function fetchCurrentVersion(): Promise<string> {
  try {
    const v = await GetVersion();
    return v.trim();
  } catch {
    // Fallback for browser dev environment
    return "0.0.0-dev";
  }
}

async function fetchLatestRelease(): Promise<{
  tag_name: string;
  html_url: string;
  published_at: string;
} | null> {
  const res = await fetch(RELEASES_URL);
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  return res.json() as Promise<{
    tag_name: string;
    html_url: string;
    published_at: string;
  }>;
}

export function useUpdateCheck(): UseUpdateCheckResult {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(
    null,
  );
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const hasCheckedRef = useRef(false);

  const check = useCallback(async () => {
    setIsChecking(true);
    try {
      const version = await fetchCurrentVersion();
      setCurrentVersion(version);

      const release = await fetchLatestRelease();

      if (
        release &&
        release.tag_name !== version &&
        isStableVersion(version)
      ) {
        setUpdateAvailable({
          latestVersion: release.tag_name,
          releaseUrl: release.html_url,
          publishedAt: release.published_at,
          downloadUrl: DOWNLOAD_URL,
        });
      } else {
        setUpdateAvailable(null);
      }
      setLastChecked(new Date());
      setCheckError(null);
    } catch (err) {
      console.error("[avnac] update check failed", err);
      setCheckError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsChecking(false);
    }
  }, []);

  const checkNow = useCallback(() => {
    setDismissed(false);
    void check();
  }, [check]);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Check once on mount
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    void check();
  }, [check]);

  return {
    currentVersion,
    updateAvailable: dismissed ? null : updateAvailable,
    isChecking,
    lastChecked,
    checkError,
    checkNow,
    dismiss,
  };
}
