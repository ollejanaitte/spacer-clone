import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type DrawerPortalProps = {
  readonly open: boolean;
  readonly children: ReactNode;
  readonly onBackdropMouseDown?: (event: MouseEvent<HTMLDivElement>) => void;
  readonly testId?: string;
};

export function DrawerPortal({
  open,
  children,
  onBackdropMouseDown,
  testId,
}: DrawerPortalProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = document.createElement("div");
    el.setAttribute("data-drawer-portal", "");
    el.className = "apollo-drawer-backdrop";
    if (testId) el.setAttribute("data-testid", testId);
    document.body.appendChild(el);
    containerRef.current = el;
    setContainer(el);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
      if (containerRef.current && document.body.contains(containerRef.current)) {
        document.body.removeChild(containerRef.current);
      }
      containerRef.current = null;
      setContainer(null);
    };
  }, [open, testId]);

  if (!open || !container) return null;

  return createPortal(
    <div role="presentation" onMouseDown={onBackdropMouseDown}>{children}</div>,
    container,
  );
}