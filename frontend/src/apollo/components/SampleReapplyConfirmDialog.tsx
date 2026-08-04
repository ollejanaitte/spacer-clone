/**
 * Step 5-R R1: sample reapply confirmation dialog (DEC-S5-0002).
 * Initial focus = Cancel. Esc / backdrop = Cancel. No silent apply.
 */
import { useEffect, useId, useRef } from "react";
import type { SampleReapplyDetection, SampleReapplyChoice } from "../bridgeStructure/sampleReapply";
import { TechnicalDetails } from "./TechnicalDetails";

type Props = {
  readonly open: boolean;
  readonly detection: SampleReapplyDetection | null;
  readonly onChoice: (choice: SampleReapplyChoice) => void;
};

export function SampleReapplyConfirmDialog({ open, detection, onChoice }: Props) {
  const titleId = useId();
  const summaryId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onChoice("cancel");
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
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
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onChoice]);

  if (!open || !detection) return null;

  const { diff } = detection;
  const categoryRows = Object.entries(diff.byCategory).filter(([, count]) => count > 0);

  return (
    <div
      className="apollo-guard-backdrop"
      data-testid="apollo-sample-reapply-dialog"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onChoice("cancel");
      }}
    >
      <section
        ref={dialogRef}
        className="apollo-guard-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={summaryId}
      >
        <h2 id={titleId}>サンプルを再適用しますか？</h2>
        <div id={summaryId} data-testid="apollo-sample-reapply-summary">
          現在のプロジェクト「{diff.currentProjectName}」とサンプル「{diff.sampleName}」に差分があります。
          無言の上書きは行いません（開発確認用・未検証）。
          <TechnicalDetails testId="apollo-reapply-tech" lines={["DEC-S5-0002", "UNVERIFIED_DEVELOPMENT_ONLY"]} />
        </div>
        <ul data-testid="apollo-sample-reapply-counts">
          <li>変更フィールド: {diff.changedFieldCount}</li>
          <li>追加: {diff.addedEntityCount}</li>
          <li>削除: {diff.removedEntityCount}</li>
          <li>
            検出:{" "}
            {
              (
                {
                  EXISTING_EDITED_PROJECT: "既存プロジェクト（編集済み）",
                  EXISTING_OTHER_PROJECT: "別プロジェクトが開かれています",
                  EXISTING_UNCHANGED_SAMPLE: "同一サンプル（未編集）",
                  EMPTY_WORKSPACE: "空の作業領域",
                } as Record<string, string>
              )[detection.kind] ?? detection.kind
            }
          </li>
        </ul>
        {categoryRows.length > 0 ? (
          <details data-testid="apollo-sample-reapply-categories">
            <summary>カテゴリ別変更</summary>
            <ul>
              {categoryRows.map(([category, count]) => (
                <li key={category}>
                  {category}: {count}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <details data-testid="apollo-sample-reapply-details">
          <summary>詳細差分を見る</summary>
          <ul>
            {diff.entries.slice(0, 40).map((entry) => (
              <li key={entry.path} data-testid={`apollo-sample-reapply-diff-${entry.path}`}>
                {entry.path}: {String(entry.before)} → {String(entry.after)} ({entry.changeType})
              </li>
            ))}
          </ul>
        </details>
        <div className="apollo-guard-actions">
          <button
            ref={cancelRef}
            type="button"
            data-testid="apollo-sample-reapply-cancel"
            onClick={() => onChoice("cancel")}
          >
            キャンセル
          </button>
          <button
            type="button"
            data-testid="apollo-sample-reapply-create-new"
            onClick={() => onChoice("create_new")}
          >
            新規プロジェクトとして開く
          </button>
          <button
            type="button"
            className="apollo-button-danger"
            data-testid="apollo-sample-reapply-replace"
            onClick={() => onChoice("replace")}
          >
            現在のプロジェクトをサンプル値で置換
          </button>
        </div>
      </section>
    </div>
  );
}
