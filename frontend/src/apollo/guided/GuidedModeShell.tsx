/**
 * Step 5 Guided Mode shell — 15-slide navigation over existing Workflow SoR.
 * DEC-S5-0009 / DEC-S5-0010. Does not invent a second bridge model.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { ProjectModel } from "../../types";
import { buildWorkflowStateModel } from "../workflow/index";
import { buildGuidedModeChromeState } from "./chrome";
import { adjacentGuidedSlide, getGuidedSlideDefinition, GUIDED_SLIDE_DEFINITIONS } from "./slides";
import type { GuidedDetailEscape, GuidedSlideId } from "./types";
import { GUIDED_SLIDE_IDS } from "./types";

export type GuidedModeShellProps = {
  readonly project: ProjectModel;
  readonly initialSlideId?: GuidedSlideId;
  readonly onOpenDetail: (escape: GuidedDetailEscape) => void;
  readonly onSave?: () => void;
  readonly children?: ReactNode;
};

export function GuidedModeShell({
  project,
  initialSlideId = "G01",
  onOpenDetail,
  onSave,
  children,
}: GuidedModeShellProps) {
  const [currentSlideId, setCurrentSlideId] = useState<GuidedSlideId>(initialSlideId);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const chrome = useMemo(() => buildGuidedModeChromeState(currentSlideId), [currentSlideId]);
  const slide = useMemo(() => getGuidedSlideDefinition(currentSlideId), [currentSlideId]);
  const workflow = useMemo(() => buildWorkflowStateModel(project), [project]);

  const go = (direction: "back" | "next") => {
    const next = adjacentGuidedSlide(currentSlideId, direction);
    if (next) setCurrentSlideId(next);
  };

  return (
    <section
      className="apollo-guided-shell"
      data-testid="apollo-guided-mode-shell"
      aria-label="Step 5 ガイド付きモード"
    >
      <header className="apollo-guided-header">
        <div>
          <p className="apollo-guided-kicker">Step 5 Guided Mode（DEC-S5-0009）</p>
          <h2 data-testid="apollo-guided-theme">{slide.theme}</h2>
          <p data-testid="apollo-guided-decide-what">この画面で決めること: {slide.decideWhat}</p>
        </div>
        <div className="apollo-guided-progress" data-testid="apollo-guided-progress" aria-label="進捗">
          <span>{chrome.progressLabel}</span>
          <ol className="apollo-guided-progress-list" aria-label="スライド一覧">
            {GUIDED_SLIDE_DEFINITIONS.map((entry) => (
              <li key={entry.slideId}>
                <button
                  type="button"
                  className={entry.slideId === currentSlideId ? "active" : undefined}
                  data-testid={`apollo-guided-jump-${entry.slideId}`}
                  aria-current={entry.slideId === currentSlideId ? "step" : undefined}
                  onClick={() => setCurrentSlideId(entry.slideId)}
                >
                  {entry.slideId}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="apollo-guided-body">
        <article className="apollo-guided-card" data-testid={`apollo-guided-slide-${currentSlideId}`}>
          <h3>主要項目</h3>
          <ul data-testid="apollo-guided-primary-fields">
            {slide.primaryFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
          <p className="apollo-guided-wf-anchor">WF anchor: {slide.wfAnchor}</p>
          <div className="apollo-guided-impact" data-testid="apollo-guided-impact-strip" aria-label="影響サマリ">
            <strong>影響</strong>
            <ul>
              {slide.impactHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
          {currentSlideId === "G15" ? (
            <p data-testid="apollo-guided-g15-pending">
              成果物パッケージ（Step 4-G）は未実装です。ここでは完了扱いにしません。
            </p>
          ) : null}
          {children}
        </article>

        <aside className="apollo-guided-side">
          <button
            type="button"
            data-testid="apollo-guided-detail-escape"
            onClick={() => onOpenDetail(slide.detailEscape)}
          >
            詳細編集へ: {slide.detailEscape.label}
          </button>
          <details
            className="apollo-guided-diagnostics"
            data-testid="apollo-guided-diagnostics"
            open={diagnosticsOpen}
            onToggle={(event) => setDiagnosticsOpen((event.target as HTMLDetailsElement).open)}
          >
            <summary>開発者診断（既定は折りたたみ / DEC-S5-0010）</summary>
            <p>
              推奨工程: {workflow.currentRecommendedStepId ?? "なし"} / 完了{" "}
              {workflow.progress.complete}/{workflow.progress.total}
            </p>
            <ul>
              {workflow.diagnostics.slice(0, 12).map((diag) => (
                <li key={diag.diagnosticId}>
                  {diag.code}: {diag.message}
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>

      <footer className="apollo-guided-nav" data-testid="apollo-guided-nav">
        <button
          type="button"
          data-testid="apollo-guided-back"
          disabled={!chrome.canGoBack}
          onClick={() => go("back")}
        >
          戻る
        </button>
        <button
          type="button"
          data-testid="apollo-guided-save-next"
          disabled={!chrome.canGoNext}
          onClick={() => {
            onSave?.();
            go("next");
          }}
        >
          保存して次へ
        </button>
        {!chrome.canGoNext ? (
          <button type="button" data-testid="apollo-guided-save" onClick={() => onSave?.()}>
            保存
          </button>
        ) : null}
        <span className="apollo-guided-slide-id" data-testid="apollo-guided-current-id">
          {currentSlideId} ({GUIDED_SLIDE_IDS.indexOf(currentSlideId) + 1}/{GUIDED_SLIDE_IDS.length})
        </span>
      </footer>
    </section>
  );
}
