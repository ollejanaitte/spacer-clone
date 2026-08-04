/**
 * Step 5 Guided Mode shell — 15-slide navigation over existing Workflow SoR.
 * DEC-S5-0009 / DEC-S5-0010. Does not invent a second bridge model.
 * L1 Japanese; slide IDs (G01–G15) and diagnostic codes remain allowlisted / L3.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { ProjectModel } from "../../types";
import { buildWorkflowStateModel } from "../workflow/index";
import { getButtonLabel, getFieldLabel, getWorkflowStepLabel } from "../i18n";
import { buildGuidedModeChromeState } from "./chrome";
import { adjacentGuidedSlide, getGuidedSlideDefinition, GUIDED_SLIDE_DEFINITIONS } from "./slides";
import type { GuidedDetailEscape, GuidedSlideId } from "./types";
import { GUIDED_SLIDE_IDS } from "./types";
import { GUIDED_PHASES, getPhaseForSlide } from "./phases";
import { TechnicalDetails } from "../components/TechnicalDetails";
import { AuthorizationBanner } from "../components/AuthorizationBanner";

export type GuidedModeShellProps = {
  readonly project: ProjectModel;
  readonly initialSlideId?: GuidedSlideId;
  readonly onOpenDetail: (escape: GuidedDetailEscape) => void;
  readonly onSave?: () => void;
  readonly children?: ReactNode;
};

function formatWfAnchor(anchor: string): string {
  if (anchor.startsWith("WF-") && anchor.includes("/")) {
    return anchor
      .split("/")
      .map((part) => (part.startsWith("WF-") ? getWorkflowStepLabel(part) : part))
      .join(" / ");
  }
  if (anchor.startsWith("WF-") && anchor.includes("..")) {
    return "関連工程（複数）";
  }
  if (anchor.startsWith("WF-")) {
    return getWorkflowStepLabel(anchor);
  }
  if (anchor === "start") return "開始";
  if (anchor === "pavement") return "舗装・区画線";
  return anchor;
}

const GOTO_LABEL = "全工程を表示";

export function GuidedModeShell({
  project,
  initialSlideId = "G01",
  onOpenDetail,
  onSave,
  children,
}: GuidedModeShellProps) {
  const [currentSlideId, setCurrentSlideId] = useState<GuidedSlideId>(initialSlideId);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const chrome = useMemo(() => buildGuidedModeChromeState(currentSlideId), [currentSlideId]);
  const slide = useMemo(() => getGuidedSlideDefinition(currentSlideId), [currentSlideId]);
  const workflow = useMemo(() => buildWorkflowStateModel(project), [project]);

  const go = (direction: "back" | "next") => {
    const next = adjacentGuidedSlide(currentSlideId, direction);
    if (next) setCurrentSlideId(next);
  };

  const slideIndex = GUIDED_SLIDE_IDS.indexOf(currentSlideId);
  const allSlideIds = GUIDED_PHASES.flatMap((p) => p.slideIds);
  const completedCount = allSlideIds.filter((id) => allSlideIds.indexOf(id) < slideIndex).length;

  const currentPhase = getPhaseForSlide(currentSlideId);
  const phaseSteps = showAllSteps ? GUIDED_SLIDE_DEFINITIONS : GUIDED_SLIDE_DEFINITIONS.filter(
    (entry) => getPhaseForSlide(entry.slideId).phaseId === currentPhase.phaseId,
  );

  return (
    <section
      className="apollo-guided-shell"
      data-testid="apollo-guided-mode-shell"
      aria-label="ガイド付きモード"
    >
      <header className="apollo-guided-header">
        <div>
          <p className="apollo-guided-kicker">ガイド付きモード</p>
          <h2 data-testid="apollo-guided-theme">{slide.theme}</h2>
          <p data-testid="apollo-guided-decide-what">この画面で決めること: {slide.decideWhat}</p>
          <AuthorizationBanner testId="apollo-guided-authorization" />
        </div>
        <div className="apollo-guided-progress" data-testid="apollo-guided-progress" aria-label="進捗">
          <div className="apollo-guided-phase-bar" data-testid="apollo-guided-phase-bar" role="list" aria-label="大工程">
            {GUIDED_PHASES.map((phase) => {
              const isCurrent = phase.phaseId === currentPhase.phaseId;
              const isCompleted = allSlideIds.indexOf(phase.slideIds[phase.slideIds.length - 1]) < slideIndex;
              return (
                <div
                  key={phase.phaseId}
                  className={`apollo-guided-phase-item${isCurrent ? " current" : ""}${isCompleted ? " completed" : ""}`}
                  role="listitem"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="apollo-guided-phase-label">{phase.label}</span>
                </div>
              );
            })}
          </div>
          <div className="apollo-guided-step-strip" data-testid="apollo-guided-step-strip">
            <span className="apollo-guided-step-strip-label">
              {currentPhase.label} ({completedCount}/{allSlideIds.length})
            </span>
            <ol className="apollo-guided-step-list" aria-label={showAllSteps ? "全工程" : "現在の工程の詳細"}>
              {phaseSteps.map((entry) => {
                const isCurrent = entry.slideId === currentSlideId;
                const isCompleted = allSlideIds.indexOf(entry.slideId) < slideIndex;
                return (
                  <li key={entry.slideId}>
                    <button
                      type="button"
                      className={`apollo-guided-step-btn${isCurrent ? " active" : ""}${isCompleted ? " completed" : ""}`}
                      data-testid={`apollo-guided-jump-${entry.slideId}`}
                      aria-current={isCurrent ? "step" : undefined}
                      aria-label={`${entry.slideId} ${entry.theme}`}
                      onClick={() => { setCurrentSlideId(entry.slideId); setShowAllSteps(false); }}
                    >
                      <span className="apollo-guided-step-icon">
                        {isCompleted ? "✓" : isCurrent ? "◉" : "○"}
                      </span>
                      <span className="apollo-guided-step-id">{entry.slideId}</span>
                      <span className="apollo-guided-step-state-text">
                        {isCompleted ? "完了" : isCurrent ? "実行中" : "未着手"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              className="apollo-guided-show-all-toggle"
              onClick={() => setShowAllSteps((v) => !v)}
              data-testid="apollo-guided-show-all-toggle"
            >
              {showAllSteps ? "現在の工程のみ表示" : GOTO_LABEL}
            </button>
          </div>
        </div>
      </header>

      <div className="apollo-guided-body">
        <article className="apollo-guided-card" data-testid={`apollo-guided-slide-${currentSlideId}`}>
          <h3>主要項目</h3>
          <ul data-testid="apollo-guided-primary-fields">
            {slide.primaryFields.map((field) => (
              <li key={field}>{getFieldLabel(field) === "表示文言未登録" ? field : getFieldLabel(field)}</li>
            ))}
          </ul>
          <p className="apollo-guided-wf-anchor">関連工程: {formatWfAnchor(slide.wfAnchor)}</p>
          <TechnicalDetails
            testId="apollo-guided-wf-anchor-tech"
            title="工程ID"
            lines={[`wfAnchor=${slide.wfAnchor}`]}
          />
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
              成果物パッケージは未実装です。ここでは完了扱いにしません。
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
            {getButtonLabel("OPEN_DETAIL")}: {slide.detailEscape.label}
          </button>
          <details
            className="apollo-guided-diagnostics"
            data-testid="apollo-guided-diagnostics"
            open={diagnosticsOpen}
            onToggle={(event) => setDiagnosticsOpen((event.target as HTMLDetailsElement).open)}
          >
            <summary>技術情報を表示（開発者診断）</summary>
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

      <footer className="apollo-guided-nav apollo-sticky-footer" data-testid="apollo-guided-nav">
        <button
          type="button"
          className="apollo-guided-nav-back"
          data-testid="apollo-guided-back"
          disabled={!chrome.canGoBack}
          onClick={() => go("back")}
        >
          ← 戻る
        </button>
        <button
          type="button"
          className="apollo-guided-nav-save-next"
          data-testid="apollo-guided-save-next"
          disabled={!chrome.canGoNext}
          onClick={() => {
            onSave?.();
            go("next");
          }}
        >
          {currentSlideId === "G15" ? "保存して完了" : getButtonLabel("SAVE_NEXT")}
        </button>
        {!chrome.canGoNext ? (
          <button type="button" className="apollo-guided-nav-save" data-testid="apollo-guided-save" onClick={() => onSave?.()}>
            最終保存
          </button>
        ) : null}
        <span className="apollo-guided-slide-id" data-testid="apollo-guided-current-id">
          {currentSlideId} ({slideIndex + 1}/{allSlideIds.length})
        </span>
      </footer>
    </section>
  );
}
