import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

const shellClass =
  'pointer-events-auto z-10 inline-flex max-w-full items-stretch overflow-visible border border-black/10 bg-white/90 shadow-[0_8px_28px_rgba(0,0,0,0.12)] backdrop-blur-xl'

/**
 * A single row of controls reads as a pill. Once the row no longer fits and the
 * shell wraps, a 999px radius curves away from the content: the first and last
 * item on every line sits outside the white background and looks like it is
 * spilling out of the toolbar. A wrapped shell becomes a padded card instead.
 */
const WRAP_THRESHOLD_PX = 56

type ShellProps = {
  children: ReactNode
  className?: string
  role?: string
  'aria-label'?: string
}

export const FloatingToolbarShell = forwardRef<HTMLDivElement, ShellProps>(
  function FloatingToolbarShell(
    { children, className = '', role, 'aria-label': ariaLabel },
    forwardedRef,
  ) {
    const [wrapped, setWrapped] = useState(false)
    const nodeRef = useRef<HTMLDivElement | null>(null)

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        nodeRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef],
    )

    useLayoutEffect(() => {
      const node = nodeRef.current
      if (!node || typeof ResizeObserver === 'undefined') return
      const measure = () => setWrapped(node.offsetHeight > WRAP_THRESHOLD_PX)
      measure()
      const observer = new ResizeObserver(measure)
      observer.observe(node)
      return () => observer.disconnect()
    }, [])

    return (
      <div
        ref={setRef}
        role={role}
        aria-label={ariaLabel}
        data-wrapped={wrapped ? 'true' : undefined}
        className={[
          shellClass,
          wrapped ? 'rounded-2xl p-1' : 'rounded-[999px]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    )
  },
)

export function FloatingToolbarDivider() {
  return (
    <div
      className="mx-0.5 w-px shrink-0 self-center bg-black/10"
      style={{ height: '1.25rem' }}
      aria-hidden
    />
  )
}

export function floatingToolbarIconButton(
  active: boolean,
  opts?: { wide?: boolean },
): string {
  const base = opts?.wide
    ? 'flex h-8 min-w-[2.75rem] shrink-0 items-center justify-center gap-0.5 rounded-lg px-1.5 text-neutral-600 outline-none transition-colors hover:bg-black/[0.06]'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-600 outline-none transition-colors hover:bg-black/[0.06]'
  return active ? `${base} bg-black/[0.08] text-neutral-900` : base
}

const floatingToolbarPopoverSurface =
  'z-50 rounded-xl border border-black/[0.08] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]'

/** Use when the panel has nested flyouts; `overflow-hidden` would clip them. */
export const floatingToolbarPopoverMenuClass = floatingToolbarPopoverSurface

export const floatingToolbarPopoverClass = `${floatingToolbarPopoverSurface} overflow-hidden`
