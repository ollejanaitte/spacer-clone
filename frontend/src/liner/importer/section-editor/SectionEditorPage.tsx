import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, HelpCircle, Save } from "lucide-react";
import { defaultImporterProjectService } from "../ImporterProjectService";
import type { JipLinerImporterProject } from "../types";
import { validateSection } from "../diagnostics/validateImporter";
import { CrossSectionSvg } from "../cross-section/CrossSectionSvg";
import { PlanPreviewPanel } from "../plan-preview/PlanPreviewPanel";
import { SectionEditorGrid } from "./SectionEditorGrid";
import { SectionHeaderEditor } from "./SectionHeaderEditor";
import { SectionNavigation } from "./SectionNavigation";
import { useSectionEditor, type CellAddress } from "./sectionEditorHooks";

export type SectionEditorPageProps = {
  projectId: string;
  bridgeId: string;
  sectionId: string;
  onBack: () => void;
  onNavigateSection: (sectionId: string) => void;
  onOpenValidation?: () => void;
  onOpenExport?: () => void;
  onSaved?: (project: JipLinerImporterProject) => void;
};

const FIELD_ORDER: CellAddress[] = [
  { field: "azimuth" },
  { field: "stationLabel" },
  { field: "stationValue" },
];

const POINT_FIELD_ORDER = [
  "x",
  "y",
  "designElevation",
  "crossSlope",
  "unitDistance",
  "cumulativeDistance",
  "unitWidth",
  "cumulativeWidth",
  "station",
] as const;

export function SectionEditorPage({
  projectId,
  bridgeId,
  sectionId,
  onBack,
  onNavigateSection,
  onOpenValidation,
  onOpenExport,
  onSaved,
}: SectionEditorPageProps) {
  const service = defaultImporterProjectService;
  const [project, setProject] = useState<JipLinerImporterProject | null>(() =>
    service.loadProject(projectId),
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const clipboardRef = useRef<string>("");

  const bridge = useMemo(
    () => project?.bridges.find((entry) => entry.id === bridgeId) ?? null,
    [project, bridgeId],
  );

  const section = useMemo(
    () => bridge?.sections.find((entry) => entry.id === sectionId) ?? null,
    [bridge, sectionId],
  );

  const {
    draft,
    focusCell,
    setFocusCell,
    resetDraft,
    setCellText,
    undo,
    redo,
    navigateSection,
    orderedSections,
    currentIndex,
  } = useSectionEditor(
    section ?? {
      id: sectionId,
      bridgeId,
      spanId: null,
      pdfPage: 0,
      azimuth: { value: null, flags: {}, sourceRef: { pdfPage: 0, enteredAt: new Date().toISOString() } },
      stationingRef: {},
      points: [],
      sourceRef: { pdfPage: 0, enteredAt: new Date().toISOString() },
    },
    bridge?.sections ?? [],
  );

  useEffect(() => {
    if (section) {
      resetDraft(section);
    }
  }, [section, resetDraft]);

  useEffect(() => {
    return () => {
      if (project) {
        service.updateLastEditedStep(projectId, "sectionEdit", { bridgeId, sectionId });
      }
    };
  }, [project, projectId, bridgeId, sectionId, service]);

  const diagnostics = useMemo(() => {
    if (!bridge) {
      return [];
    }
    return validateSection(draft, bridge, bridge.sections);
  }, [bridge, draft]);

  const buildCellOrder = useCallback((): CellAddress[] => {
    const order: CellAddress[] = [...FIELD_ORDER];
    for (const point of draft.points) {
      for (const field of POINT_FIELD_ORDER) {
        order.push({ pointId: point.id, field });
      }
    }
    return order;
  }, [draft.points]);

  const moveFocus = useCallback(
    (direction: "next" | "prev") => {
      const order = buildCellOrder();
      const currentIdx = order.findIndex(
        (cell) => cell.field === focusCell.field && cell.pointId === focusCell.pointId,
      );
      const nextIdx = direction === "next" ? currentIdx + 1 : currentIdx - 1;
      const target = order[nextIdx];
      if (target) {
        setFocusCell(target);
        const selector = target.pointId
          ? `[data-testid="section-cell-${target.pointId}-${target.field}"]`
          : `[data-testid="section-editor-${target.field.replace("stationLabel", "station-label").replace("stationValue", "station-value")}"]`;
        const element = document.querySelector(selector) as HTMLElement | null;
        element?.focus();
      }
    },
    [buildCellOrder, focusCell.field, focusCell.pointId, setFocusCell],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (helpOpen && event.key === "Escape") {
        setHelpOpen(false);
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (mod && (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey))) {
        event.preventDefault();
        redo();
        return;
      }
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (event.shiftKey) {
          onOpenExport?.();
        } else {
          handleSaveRef.current();
        }
        return;
      }
      if (mod && event.key.toLowerCase() === "c") {
        const active = document.activeElement as HTMLInputElement | null;
        if (active?.value != null) {
          clipboardRef.current = active.value;
        }
        return;
      }
      if (mod && event.key.toLowerCase() === "v") {
        const active = document.activeElement as HTMLInputElement | null;
        if (active?.value != null && clipboardRef.current) {
          setCellText(focusCell, clipboardRef.current);
        }
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        moveFocus(event.shiftKey ? "prev" : "next");
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        moveFocus(event.shiftKey ? "prev" : "next");
        return;
      }
      if (event.key === "F2") {
        event.preventDefault();
        moveFocus("next");
        return;
      }
      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        const prev = navigateSection("prev");
        if (prev) {
          onNavigateSection(prev.id);
        }
        return;
      }
      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        const next = navigateSection("next");
        if (next) {
          onNavigateSection(next.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [helpOpen, moveFocus, navigateSection, onNavigateSection, onOpenExport, redo, setCellText, focusCell, undo]);

  const handleSaveRef = useRef<() => void>(() => undefined);

  const handleSave = useCallback(() => {
    if (!project || !bridge) {
      setErrorMessage("橋梁が見つかりません。");
      return;
    }

    setErrorMessage(null);
    try {
      const saved = service.saveBridgeSection(projectId, bridgeId, draft);
      setProject(saved);
      setStatusMessage("横断面を保存しました。");
      onSaved?.(saved);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました。");
    }
  }, [bridge, bridgeId, draft, onSaved, project, projectId, service]);

  handleSaveRef.current = handleSave;

  if (!project || !bridge || !section) {
    return (
      <main className="liner-list-page section-editor-page" data-testid="section-editor-page">
        <header className="liner-list-header">
          <div>
            <h1>横断面編集</h1>
            <p>横断面が見つかりません。</p>
          </div>
          <button type="button" onClick={onBack} data-testid="section-editor-back">
            <ArrowLeft size={16} />
            戻る
          </button>
        </header>
      </main>
    );
  }

  return (
    <main className="liner-list-page section-editor-page" data-testid="section-editor-page">
      <header className="liner-list-header">
        <div>
          <h1>横断面編集</h1>
          <p>
            {project.name} / {bridge.name} — PDF Page {draft.pdfPage}
          </p>
        </div>
        <div className="liner-list-header-actions">
          <button
            type="button"
            className="importer-help-header"
            onClick={() => setHelpOpen((open) => !open)}
            data-testid="section-editor-help"
          >
            <HelpCircle size={16} />
            わからん
          </button>
          <button type="button" onClick={onBack} data-testid="section-editor-back">
            <ArrowLeft size={16} />
            戻る
          </button>
          <button type="button" onClick={handleSave} data-testid="section-editor-save">
            <Save size={16} />
            保存
          </button>
        </div>
      </header>

      {helpOpen && (
        <dialog open className="section-editor-help-dialog" data-testid="section-editor-help-dialog">
          <h2>横断面編集 ヘルプ</h2>
          <p>
            Tab / Shift+Tab / Enter / Shift+Enter でセル移動。Ctrl+Z/Y で Undo/Redo (50 step)。
            Ctrl+S 保存、Ctrl+Shift+S でエクスポート画面へ。Alt+←/→ で前後 Section。
          </p>
          <button type="button" onClick={() => setHelpOpen(false)}>
            閉じる (Esc)
          </button>
        </dialog>
      )}

      {statusMessage && (
        <p className="section-editor-status" data-testid="section-editor-status">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="section-editor-error" data-testid="section-editor-error">
          {errorMessage}
        </p>
      )}

      <SectionNavigation
        currentIndex={currentIndex}
        total={orderedSections.length}
        onPrev={() => {
          const prev = navigateSection("prev");
          if (prev) {
            onNavigateSection(prev.id);
          }
        }}
        onNext={() => {
          const next = navigateSection("next");
          if (next) {
            onNavigateSection(next.id);
          }
        }}
      />

      <div className="section-editor-layout">
        <div className="section-editor-main">
          <SectionHeaderEditor
            section={draft}
            focusCell={focusCell}
            onFocus={setFocusCell}
            onChange={setCellText}
          />
          <SectionEditorGrid
            section={draft}
            focusCell={focusCell}
            diagnostics={diagnostics}
            onFocus={setFocusCell}
            onChange={setCellText}
          />

          <aside className="section-editor-diagnostics" data-testid="section-editor-diagnostics">
            <h3>診断 ({diagnostics.length})</h3>
            <ul>
              {diagnostics.slice(0, 10).map((item) => (
                <li key={item.id} className={`diagnostic-${item.level}`}>
                  [{item.level}] {item.message}
                </li>
              ))}
            </ul>
            {onOpenValidation && (
              <button type="button" onClick={onOpenValidation} data-testid="section-editor-open-validation">
                バリデーション詳細
              </button>
            )}
          </aside>
        </div>

        <div className="section-editor-previews">
          <CrossSectionSvg section={draft} />
          <PlanPreviewPanel
            sections={bridge.sections.map((entry) =>
              entry.id === draft.id ? draft : entry,
            )}
            currentSectionId={draft.id}
            bridgeId={bridge.id}
          />
        </div>
      </div>

      <footer className="section-editor-footer">
        <button type="button" onClick={onBack}>
          横断面リストへ
        </button>
        <button type="button" onClick={handleSave} data-testid="section-editor-save-footer">
          保存
        </button>
        {onOpenExport && (
          <button type="button" onClick={onOpenExport} data-testid="section-editor-open-export">
            エクスポートへ
          </button>
        )}
      </footer>
    </main>
  );
}
