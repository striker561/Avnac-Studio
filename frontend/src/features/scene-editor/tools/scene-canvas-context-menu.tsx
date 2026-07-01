type Props = {
  x: number;
  y: number;
  hasSelection: boolean;
  locked: boolean;
  canDownloadPng?: boolean;
  onCopy: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onDownloadPng?: () => void;
};

const itemClass =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-neutral-800 outline-none hover:bg-black/5 focus:bg-black/5";

export default function SceneCanvasContextMenu({
  x,
  y,
  hasSelection,
  locked,
  canDownloadPng = false,
  onCopy,
  onDuplicate,
  onToggleLock,
  onPaste,
  onDelete,
  onDownloadPng,
}: Props) {
  return (
    <div
      data-avnac-chrome
      data-scene-context-menu
      role="menu"
      className="fixed z-90 min-w-48 overflow-hidden rounded-xl border border-black/8 bg-white py-1 shadow-[0_18px_48px_rgba(0,0,0,0.16)] backdrop-blur"
      style={{
        left: `min(${x}px, calc(100vw - 12.5rem))`,
        top: `min(${y}px, calc(100vh - 18rem))`,
      }}
    >
      {hasSelection ? (
        <>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={onCopy}
          >
            Copy
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={onDuplicate}
          >
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={onToggleLock}
          >
            {locked ? "Unlock" : "Lock"}
          </button>
          {canDownloadPng && onDownloadPng ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={onDownloadPng}
            >
              Download PNG
            </button>
          ) : null}
          <div className="my-1 h-px bg-black/6" aria-hidden />
        </>
      ) : null}
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onClick={onPaste}
      >
        Paste
      </button>
      {hasSelection ? (
        <>
          <div className="my-1 h-px bg-black/6" aria-hidden />
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={onDelete}
          >
            Delete
          </button>
        </>
      ) : null}
    </div>
  );
}
