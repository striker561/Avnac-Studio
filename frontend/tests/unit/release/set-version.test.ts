import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../scripts/set-version.mjs",
);

const FIXTURES: Record<string, string> = {
  "main.go": 'package main\n\n//go:embed all:frontend/dist\nvar assets embed.FS\n\nvar appVersion = "v0.1.0"\n',
  "wails.json": '{\n  "name": "Avnac",\n  "info": {\n    "productVersion": "0.1.0"\n  }\n}\n',
  "build/windows/installer/wails_tools.nsh": '!ifndef INFO_PRODUCTVERSION\n    !define INFO_PRODUCTVERSION "0.1.0"\n!endif\n',
};

type Workspace = {
  root: string;
  read: (relative: string) => string;
  cleanup: () => void;
};

function workspace(): Workspace {
  const root = mkdtempSync(path.join(tmpdir(), "avnac-version-"));
  for (const [relative, body] of Object.entries(FIXTURES)) {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, body, "utf8");
  }
  return {
    root,
    read: (relative) => readFileSync(path.join(root, relative), "utf8"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function run(args: string[]): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [SCRIPT, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: failure.status ?? 1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

describe("scripts/set-version.mjs", () => {
  it("stamps the tag into the app version, wails.json and the installer defines", () => {
    const ws = workspace();
    try {
      const result = run(["v1.4.0", "--root", ws.root]);
      expect(result.code).toBe(0);

      // The app shows this string and the updater compares it to release tags,
      // so it keeps the v prefix.
      expect(ws.read("main.go")).toContain('var appVersion = "v1.4.0"');
      // Windows/macOS metadata wants a bare version.
      expect(ws.read("wails.json")).toContain('"productVersion": "1.4.0"');
      expect(ws.read("build/windows/installer/wails_tools.nsh")).toContain(
        '!define INFO_PRODUCTVERSION "1.4.0"',
      );
    } finally {
      ws.cleanup();
    }
  });

  it("accepts a version without the v prefix", () => {
    const ws = workspace();
    try {
      expect(run(["2.0.1", "--root", ws.root]).code).toBe(0);
      expect(ws.read("main.go")).toContain('var appVersion = "v2.0.1"');
      expect(ws.read("wails.json")).toContain('"productVersion": "2.0.1"');
    } finally {
      ws.cleanup();
    }
  });

  it("is a no-op when the version is already correct", () => {
    const ws = workspace();
    try {
      expect(run(["v1.4.0", "--root", ws.root]).code).toBe(0);
      const afterFirst = ws.read("main.go");

      const second = run(["v1.4.0", "--root", ws.root]);
      expect(second.code).toBe(0);
      expect(second.output).toContain("nothing to do");
      expect(ws.read("main.go")).toBe(afterFirst);
    } finally {
      ws.cleanup();
    }
  });

  it("reports stale files with --check instead of writing them", () => {
    const ws = workspace();
    try {
      const stale = run(["v1.4.0", "--root", ws.root, "--check"]);
      expect(stale.code).toBe(1);
      expect(stale.output).toContain("out of date");
      // Nothing was written.
      expect(ws.read("main.go")).toContain('"v0.1.0"');

      expect(run(["v0.1.0", "--root", ws.root, "--check"]).code).toBe(0);
    } finally {
      ws.cleanup();
    }
  });

  it("rejects a version that is not a version", () => {
    const ws = workspace();
    try {
      const result = run(["latest", "--root", ws.root]);
      expect(result.code).toBe(1);
      expect(result.output).toContain("is not a version");
    } finally {
      ws.cleanup();
    }
  });

  it("fails loudly when a version file no longer matches the expected pattern", () => {
    const ws = workspace();
    try {
      // Simulates a refactor that renames appVersion: silently shipping the old
      // number would be worse than a red build.
      writeFileSync(path.join(ws.root, "main.go"), "package main\n", "utf8");
      const result = run(["v1.4.0", "--root", ws.root]);
      expect(result.code).toBe(1);
      expect(result.output).toContain("does not contain the expected pattern");
    } finally {
      ws.cleanup();
    }
  });
});
