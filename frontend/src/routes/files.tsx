import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  FileImportIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";
import DeleteConfirmDialog from "@/components/dialogs/delete-confirm-dialog";
import FileCard from "@/components/files/file-card";
import FilesSelectionToolbar from "@/components/files/files-selection-toolbar";
import NewCanvasDialog from "@/components/dialogs/new-canvas-dialog";
import { avnacDocumentPreviewEvictPersistId } from "@/lib/avnac-document-preview";
import {
  idbDeleteDocument,
  idbListDocuments,
  idbPutDocument,
  type AvnacEditorIdbListItem,
} from "@/lib/avnac-editor-idb";
import { downloadAvnacJsonForId } from "@/lib/avnac-files-export";
import {
  clampPageIndex,
  parseAvnacImport,
} from "@/lib/avnac-multi-page-document";
import { saveStoredPages } from "@/lib/avnac-multi-page-storage";
import { useUpdateCheck } from "@/lib/use-update-check";

export const Route = createFileRoute("/files")({
  component: FilesPage,
});

function formatUpdatedAt(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

type ActionCardProps = {
  icon: typeof Add01Icon;
  title: string;
  description: string;
  tone: "dark" | "light";
  onClick: () => void;
};

function FilesActionCard({
  icon,
  title,
  description,
  tone,
  onClick,
}: ActionCardProps) {
  const dark = tone === "dark";

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onClick}
        className={[
          "group relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border p-5 text-left transition duration-300",
          "hover:-translate-y-1",
          dark
            ? "border-white/10 bg-[#0e0e0e] text-white"
            : "border-black/10 bg-white text-[var(--text)]",
        ].join(" ")}
      >
        {/* Animated light layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={[
              "absolute -inset-[40%] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100",
              dark
                ? "bg-[conic-gradient(from_0deg_at_50%_50%,transparent,rgba(255,255,255,0.12),transparent)]"
                : "bg-[conic-gradient(from_0deg_at_50%_50%,transparent,rgba(0,0,0,0.06),transparent)]",
              "animate-[spin_6s_linear_infinite]",
            ].join(" ")}
          />
        </div>

        {/* Content */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <span
            className={[
              "mb-5 inline-flex size-16 items-center justify-center rounded-[1.35rem] border transition",
              dark
                ? "border-white/10 bg-white/5"
                : "border-black/10 bg-black/[0.03]",
            ].join(" ")}
          >
            <HugeiconsIcon icon={icon} size={26} strokeWidth={1.75} />
          </span>

          <span className="text-lg font-semibold leading-tight">{title}</span>

          <span
            className={[
              "mt-2 max-w-[28ch] text-sm leading-6",
              dark ? "text-white/70" : "text-[var(--text-muted)]",
            ].join(" ")}
          >
            {description}
          </span>
        </div>
      </button>
    </li>
  );
}

function FilesPage() {
  const [items, setItems] = useState<AvnacEditorIdbListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [newCanvasOpen, setNewCanvasOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    ids: string[];
    title: string;
    message: string;
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const {
    currentVersion,
    updateAvailable,
    dismiss: dismissUpdate,
  } = useUpdateCheck();

  const isBirthday = (() => {
    const now = new Date();
    return now.getMonth() === 9 && now.getDate() === 24; // October 24
  })();
  const [birthdayDismissed, setBirthdayDismissed] = useState(false);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const refreshList = useCallback(() => {
    void idbListDocuments()
      .then((list) => {
        setItems(list);
        setLoadError(null);
      })
      .catch(() => {
        setLoadError("Could not load files.");
        setItems([]);
      });
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!items) return;
    if (items.length === 0) {
      setSelectedIds((prev) => (prev.length ? [] : prev));
      return;
    }
    const valid = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (deleteDialog) {
        e.preventDefault();
        setDeleteDialog(null);
        return;
      }
      if (selectedIds.length > 0) clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteDialog, selectedIds.length, clearSelection]);

  const bulkDownload = useCallback(() => {
    const ids = [...selectedIds];
    void (async () => {
      try {
        for (const id of ids) {
          await downloadAvnacJsonForId(id);
          await new Promise((r) => setTimeout(r, 140));
        }
      } catch (err) {
        console.error("[avnac] bulk download failed", err);
      }
    })();
  }, [selectedIds]);

  const bulkTrash = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const n = ids.length;
    setDeleteDialog({
      ids,
      title: n === 1 ? "Remove this file?" : "Remove these files?",
      message:
        n === 1
          ? "This will permanently remove the file. This cannot be undone."
          : `This will permanently remove ${n} files. This cannot be undone.`,
    });
  }, [selectedIds]);

  const confirmDelete = useCallback(() => {
    if (!deleteDialog) return;
    const ids = [...deleteDialog.ids];
    setDeleteDialog(null);
    void (async () => {
      try {
        for (const id of ids) {
          await idbDeleteDocument(id);
          avnacDocumentPreviewEvictPersistId(id);
        }
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        refreshList();
      } catch (err) {
        console.error("[avnac] delete failed", err);
      }
    })();
  }, [deleteDialog, refreshList]);

  const requestDeleteFile = useCallback((id: string) => {
    setDeleteDialog({
      ids: [id],
      title: "Remove this file?",
      message: "This will permanently remove the file. This cannot be undone.",
    });
  }, []);

  const importWorkspace = useCallback(() => {
    const input = importInputRef.current;
    if (!input) return;
    input.click();
  }, []);

  const onImportWorkspaceChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";
      if (!file) return;

      void (async () => {
        try {
          setImportError(null);
          const text = await file.text();
          let parsed: unknown;
          try {
            parsed = JSON.parse(text) as unknown;
          } catch {
            setImportError(
              "File is not valid JSON. Make sure you exported from Avnac.",
            );
            return;
          }
          const imported = parseAvnacImport(parsed);
          if (!imported) {
            setImportError(
              "File format not recognised. Export a file from Avnac Studio or avnac.design, then import it here.",
            );
            return;
          }

          const id = crypto.randomUUID();
          const baseName =
            file.name
              .replace(/\.(workspace|page)\.avnac$/i, "")
              .replace(/\.avnac\.json$/i, "")
              .replace(/\.(json|avnac)$/i, "")
              .trim() || "Imported";

          if (imported.kind === "single") {
            await idbPutDocument(id, imported.document, { name: baseName });
          } else {
            const index = clampPageIndex(
              imported.document.pages.length,
              imported.document.currentPage,
            );
            const currentDoc = imported.document.pages[index]!;
            await idbPutDocument(id, currentDoc, { name: baseName });
            await saveStoredPages(
              id,
              imported.document.pages,
              index,
              imported.document.pageNames,
            );
          }

          refreshList();
        } catch (err) {
          console.error("[avnac] workspace import failed", err);
          setImportError(
            "Something went wrong while importing. Check the console for details.",
          );
        }
      })();
    },
    [refreshList],
  );

  const selectionCount = selectedIds.length;
  const isEmptyState = items !== null && items.length === 0;

  return (
    <main className="hero-page relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
      <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />

      <div className="relative z-[1] flex flex-1 flex-col">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] pt-4 sm:pt-5">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-3 px-5 pointer-events-auto sm:px-8">
            <Link
              to="/settings"
              className="relative inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/[0.12] bg-white/86 px-6 py-2.5 text-[15px] font-medium text-[var(--text)] transition hover:border-black/[0.2] hover:bg-white sm:min-h-12 sm:px-8 sm:py-3 sm:text-[1.0625rem]"
            >
              <HugeiconsIcon
                icon={Settings01Icon}
                size={18}
                strokeWidth={1.75}
                className="shrink-0"
              />
              Settings
              {updateAvailable ? (
                <span
                  className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-red-500"
                  aria-label="Update available"
                />
              ) : null}
            </Link>
          </div>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".workspace.avnac,.page.avnac,.avnac,.json,.avnac.json,application/json"
          className="hidden"
          onChange={onImportWorkspaceChange}
        />

        <div className="shrink-0 pt-4 sm:pt-5" aria-hidden>
          <div className="mx-auto flex h-11 w-full max-w-6xl justify-end px-5 sm:h-12 sm:px-8" />
        </div>

        <div
          className={`mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14 lg:py-16 ${selectionCount > 0 ? "pb-28 sm:pb-32" : ""}`}
        >
          <div className="rise-in">
            {!isEmptyState ? (
              <>
                <h1 className="display-title mb-4 text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.06] tracking-[-0.03em] text-[var(--text)]">
                  Files
                </h1>
                <p className="mb-12 max-w-xl text-lg leading-[1.6] text-[var(--text-muted)] sm:text-xl sm:leading-[1.55]">
                  Your files live here. Open one to keep editing.
                </p>
              </>
            ) : null}

            {loadError ? (
              <p className="text-base leading-relaxed text-red-600">
                {loadError}
              </p>
            ) : null}

            {importError ? (
              <p className="text-base leading-relaxed text-red-600">
                {importError}
              </p>
            ) : null}

            {items === null ? (
              <p className="text-lg text-[var(--text-muted)]">Loading…</p>
            ) : items.length === 0 ? (
              <div className="max-w-xl">
                <h1 className="display-title m-0 text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.06] tracking-[-0.03em] text-[var(--text)]">
                  Get started
                </h1>
                <p className="mt-3 text-lg leading-[1.6] text-[var(--text-muted)]">
                  Create your first canvas. Everything autosaves as you work.
                </p>
                <ul className="mt-8 m-0 grid list-none grid-cols-1 gap-5 sm:grid-cols-2">
                  <FilesActionCard
                    icon={Add01Icon}
                    title="New file"
                    description="Start from a blank canvas with autosave enabled."
                    tone="dark"
                    onClick={() => setNewCanvasOpen(true)}
                  />
                  <FilesActionCard
                    icon={FileImportIcon}
                    title="Import workspace"
                    description="Bring in an existing .workspace.avnac or .json file."
                    tone="light"
                    onClick={importWorkspace}
                  />
                </ul>
              </div>
            ) : (
              <ul className="m-0 grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-7">
                <FilesActionCard
                  icon={Add01Icon}
                  title="New file"
                  description="Create a fresh canvas."
                  tone="dark"
                  onClick={() => setNewCanvasOpen(true)}
                />
                <FilesActionCard
                  icon={FileImportIcon}
                  title="Import workspace"
                  description="Import a file and keep working."
                  tone="light"
                  onClick={importWorkspace}
                />
                {items.map((row) => (
                  <FileCard
                    key={row.id}
                    row={row}
                    formatUpdatedAt={formatUpdatedAt}
                    onListChange={refreshList}
                    selected={selectedIds.includes(row.id)}
                    onToggleSelect={toggleSelect}
                    onRequestDelete={requestDeleteFile}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <NewCanvasDialog
        open={newCanvasOpen}
        onClose={() => setNewCanvasOpen(false)}
      />
      <FilesSelectionToolbar
        count={selectionCount}
        onClear={clearSelection}
        onDownload={bulkDownload}
        onTrash={bulkTrash}
      />
      <DeleteConfirmDialog
        open={deleteDialog !== null}
        title={deleteDialog?.title ?? ""}
        message={deleteDialog?.message ?? ""}
        onClose={() => setDeleteDialog(null)}
        onConfirm={confirmDelete}
      />

      {/* Version badge */}
      {currentVersion ? (
        <button
          type="button"
          onClick={() =>
            BrowserOpenURL("https://github.com/striker561/Avnac-Studio#readme")
          }
          className="fixed bottom-4 left-5 z-[200] cursor-pointer text-[11px] font-medium text-[var(--text-muted)] opacity-50 transition hover:opacity-100"
        >
          {currentVersion}
        </button>
      ) : null}

      {/* Birthday toast */}
      {isBirthday && !birthdayDismissed ? (
        <div className="fixed bottom-5 right-5 z-[300] flex max-w-sm items-start gap-3 rounded-2xl border border-black/[0.1] bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">
              🎂 It's a special day!
            </p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
              Today is the birthday of @d3uc3y, co-maintainer of Avnac. Send them a wish!
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => BrowserOpenURL("https://x.com/d3uc3y")}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--text)] px-4 text-xs font-medium text-white transition hover:bg-[#262626]"
              >
                Wish happy birthday 🎉
              </button>
              <button
                type="button"
                onClick={() => setBirthdayDismissed(true)}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-black/[0.12] bg-transparent px-4 text-xs font-medium text-[var(--text)] transition hover:bg-black/[0.04]"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss birthday notification"
            onClick={() => setBirthdayDismissed(true)}
            className="mt-0.5 shrink-0 cursor-pointer rounded-full p-1 text-[var(--text-muted)] transition hover:bg-black/[0.06]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : null}

      {/* Update toast */}
      {updateAvailable ? (
        <div className="fixed bottom-5 right-5 z-[300] flex max-w-sm items-start gap-3 rounded-2xl border border-black/[0.1] bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">
              Update available - {updateAvailable.latestVersion}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
              A new version of Avnac is ready to download.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => BrowserOpenURL("https://avnac.design/studio#platform-downloads")}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--text)] px-4 text-xs font-medium text-white transition hover:bg-[#262626]"
              >
                Download
              </button>
              <button
                type="button"
                onClick={dismissUpdate}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-black/[0.12] bg-transparent px-4 text-xs font-medium text-[var(--text)] transition hover:bg-black/[0.04]"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss update notification"
            onClick={dismissUpdate}
            className="mt-0.5 shrink-0 cursor-pointer rounded-full p-1 text-[var(--text-muted)] transition hover:bg-black/[0.06]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
    </main>
  );
}
