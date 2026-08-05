import { useEffect, useId, useRef, type ReactNode } from "react";
import { DrawerPortal } from "./DrawerPortal";

export type GuidedDetailDrawerProps = {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly onClose: () => void;
  readonly children?: ReactNode;
  readonly testId?: string;
  readonly isDirty?: boolean;
  readonly onSave?: () => void;
};

export function GuidedDetailDrawer({
  open,
  title,
  description,
  onClose,
  children,
  testId = "apollo-guided-detail-drawer",
  isDirty,
  onSave,
}: GuidedDetailDrawerProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Keep the latest onClose without coupling the focus-lifecycle effect to its
  // identity. Parent re-renders create a new onClose reference each time; the
  // focus effect must NOT re-run (and steal focus) merely because onClose changed.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    // Autofocus only on the closed→open transition. Focus first input if
    // available, otherwise close button.
    const inputs = panelRef.current?.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    );
    const firstInput = inputs?.[0];
    if (firstInput) {
      firstInput.focus();
    } else {
      closeRef.current?.focus();
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      // The effect only re-runs its cleanup when `open` transitions to false
      // (actual close) or the component unmounts — NOT on parent re-renders.
      // Restore focus to the trigger only in those real close/unmount cases.
      triggerRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <DrawerPortal
      open={open}
      testId={testId}
      onBackdropMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        className="apollo-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <header className="apollo-drawer-header">
          <div className="apollo-drawer-title">
            <h2 id={titleId} data-testid={`${testId}-title`}>{title}</h2>
            {description ? (
              <p id={descId} data-testid={`${testId}-desc`}>{description}</p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="apollo-drawer-close"
            data-testid={`${testId}-close`}
            onClick={onClose}
          >
            編集を閉じる ✕
          </button>
        </header>
        <div className="apollo-drawer-body" data-testid={`${testId}-body`}>
          {children}
        </div>
        <footer className="apollo-drawer-footer">
          <div className="apollo-drawer-footer-left">
            <span className="apollo-drawer-footer-hint">編集内容は即座にプロジェクトへ反映されます。</span>
            {isDirty !== undefined ? (
              <span
                className={`apollo-drawer-dirty${isDirty ? " apollo-drawer-dirty-unsaved" : " apollo-drawer-dirty-saved"}`}
                data-testid={`${testId}-dirty`}
              >
                {isDirty ? "変更あり" : "保存済み"}
              </span>
            ) : null}
          </div>
          <div className="apollo-drawer-footer-actions">
            {onSave ? (
              <button
                type="button"
                className="apollo-drawer-save"
                data-testid={`${testId}-save`}
                onClick={onSave}
              >
                保存
              </button>
            ) : null}
            <button
              type="button"
              className="apollo-drawer-done"
              data-testid={`${testId}-done`}
              onClick={onClose}
            >
              完了
            </button>
          </div>
        </footer>
      </section>
    </DrawerPortal>
  );
}