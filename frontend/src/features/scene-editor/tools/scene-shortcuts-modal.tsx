import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type Row = {
  keys: string;
  action: string;
};

const ROWS: Row[] = [
  { keys: "Cmd/Ctrl + Z", action: "Undo" },
  { keys: "Cmd/Ctrl + Shift + Z / Y", action: "Redo" },
  { keys: "Cmd/Ctrl + D", action: "Duplicate selection" },
  { keys: "Cmd/Ctrl + C / V", action: "Copy / paste" },
  { keys: "Cmd/Ctrl + A", action: "Select all" },
  { keys: "Cmd/Ctrl + L", action: "Lock / unlock selection" },
  { keys: "Delete / Backspace", action: "Delete selection" },
  { keys: "Cmd/Ctrl + ] / [", action: "Bring forward / send backward" },
  { keys: "Cmd/Ctrl + Shift + ] / [", action: "Bring to front / send back" },
  { keys: "Cmd/Ctrl + 0", action: "Reset zoom to 100%" },
  { keys: "Cmd/Ctrl + 1", action: "Fit artboard to viewport" },
  { keys: "Cmd/Ctrl + = / -", action: "Zoom in / out" },
  { keys: "Cmd/Ctrl + wheel", action: "Zoom with mouse" },
  { keys: "Space + drag", action: "Pan viewport" },
  { keys: "Middle-mouse drag", action: "Pan viewport" },
  { keys: "Arrow keys", action: "Nudge selection 1px" },
  { keys: "Shift + Arrow keys", action: "Nudge selection 10px" },
  { keys: "?", action: "Toggle this shortcuts panel" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SceneShortcutsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-20000 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Scene keyboard shortcuts"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        data-avnac-chrome
        className="w-full max-w-md overflow-hidden rounded-2xl border border-black/8 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-black/6 px-4 py-3">
          <h2 className="m-0 text-base font-semibold text-neutral-900">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-black/6"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-4 py-2">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.keys} className="border-b border-black/4">
                  <td className="py-2 pr-3 font-medium tabular-nums text-neutral-800">
                    {row.keys}
                  </td>
                  <td className="py-2 text-neutral-600">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
