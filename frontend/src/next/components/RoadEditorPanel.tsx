/**
 * Road Editor Panel (Phase 7.2 FROZEN D-05 / Phase 7.3 WP-G).
 *
 * Rescues the legacy LINER editors into the new Road Module and connects them
 * to the Canonical Road Data (modules.road.data.roadData) via the editor
 * bridge. Any editor change commits atomically to the canonical data
 * (edit -> validate -> atomic canonical commit -> checksum).
 */

import { useMemo, useRef, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { ensureRoadData, writeRoadData } from "../modules/roadModuleAdapter";
import { loadRoadEditorDraft, commitRoadEditorDraft } from "../modules/road/roadEditorDraft";
import {
  updateCrossSectionTemplate,
  updateCrossSectionCrossSlope,
  updateVerticalAlignment,
  updateWidthChangePoints,
  updateCrossSlopeIntervals,
} from "../modules/road/roadEditorIntegration";
import type { BuildIntermediateInput } from "../../liner/core/pipeline/pipeline";
import { createDefaultLinerDraft } from "../../liner/adapters/linerUiAdapter";
import { HorizontalElementEditor } from "../../liner/components/HorizontalElementEditor";
import { VerticalElementEditor } from "../../liner/components/VerticalElementEditor";
import { CrossSectionTemplateEditor } from "../../liner/components/CrossSectionTemplateEditor";
import { AlignmentManager } from "../../liner/components/AlignmentManager";
import { LinerStationProfilePanel } from "../../liner/components/LinerStationProfilePanel";
import { WidthChangePointEditor } from "../../liner/components/WidthChangePointEditor";
import { CrossfallIntervalEditor } from "../../liner/components/CrossfallIntervalEditor";
import { SuperelevationEditor } from "../../liner/components/SuperelevationEditor";
import { MountainViaduct3dViewer } from "../../liner/samples/mountain-viaduct-500/viewer";
import { roadCameraForDraft } from "../modules/road/road3dCamera";

export interface RoadEditorPanelProps {
  readonly projectId: string;
  readonly featureFlagEnabled?: boolean;
  /** Controlled draft (shared with the Road Module shell). Falls back to loading from canonical roadData. */
  readonly draft?: BuildIntermediateInput;
  /** Mirrors a controlled draft back to the owner so previews can live-update. */
  readonly onDraftChange?: (draft: BuildIntermediateInput) => void;
}

export function RoadEditorPanel({ projectId, featureFlagEnabled = true, draft: controlledDraft, onDraftChange }: RoadEditorPanelProps) {
  const manager = getProjectManager();
  const [internalDraft, setInternalDraft] = useState<BuildIntermediateInput>(() => {
    if (!featureFlagEnabled) {
      return createDefaultLinerDraft();
    }
    const roadData = ensureRoadData(manager, projectId, { project: manager.getProject(projectId) as unknown as import("../../types").ProjectModel });
    if (roadData.ok) {
      const loaded = loadRoadEditorDraft(roadData.roadData);
      if (loaded.ok) {
        return loaded.draft;
      }
    }
    return createDefaultLinerDraft();
  });
  const draft = controlledDraft ?? internalDraft;
  const [message, setMessage] = useState<string | null>(null);
  const latestRef = useRef<BuildIntermediateInput>(draft);

  const verticalAlignment = draft.verticalAlignment;
  const crossSection = Array.isArray(draft.crossSections) ? draft.crossSections[0] : undefined;
  const hasEditor = featureFlagEnabled;
  const roadHalfWidth = useMemo(() => {
    const maxOffset = Math.max(
      ...(crossSection?.offsetLines ?? []).map((line) => Math.abs(line.offset)),
      0,
    );
    return maxOffset > 0 ? maxOffset : undefined;
  }, [crossSection]);

  const commit = useMemo(() => {
    function write(next: BuildIntermediateInput): void {
      latestRef.current = next;
      if (onDraftChange) {
        onDraftChange(next);
      } else {
        setInternalDraft(next);
      }
      const meta = { source: "new" as const, migratedAt: new Date().toISOString() };
      const committed = commitRoadEditorDraft(next, meta);
      if (!committed.ok || !committed.canonical) {
        setMessage("Canonical commit NG（fail-closed）。");
        return;
      }
      const writeResult = writeRoadData(manager, projectId, committed.canonical);
      if (!writeResult.ok) {
        setMessage("Canonical Road Data保存NG（fail-closed）。");
        return;
      }
      setMessage("Canonical Road Dataへ保存しました。");
      void manager.flushPendingSaves();
    }
    return {
      update(next: BuildIntermediateInput): void {
        write(next);
      },
      apply(update: BuildIntermediateInput | ((current: BuildIntermediateInput) => BuildIntermediateInput)): void {
        const current = latestRef.current;
        const next = typeof update === "function" ? update(current) : update;
        write(next);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, manager, onDraftChange]);

  if (!hasEditor) {
    return null;
  }

  return (
    <section className="next-road-editors" data-testid="road-editors">
      <h2 className="next-home-section-title">線形座標計算（実務Editor・救出）</h2>

      <div className="next-road-editor-block" data-testid="road-editor-horizontal">
        <HorizontalElementEditor
          draft={draft}
          onDraftChange={(next) => commit.update(next)}
        />
      </div>

      {verticalAlignment && (
        <div className="next-road-editor-block" data-testid="road-editor-vertical">
          <VerticalElementEditor
            verticalAlignment={verticalAlignment}
            onVerticalAlignmentChange={(next) =>
              commit.update(updateVerticalAlignment(draft, next))
            }
          />
        </div>
      )}

      {crossSection && (
        <div className="next-road-editor-block" data-testid="road-editor-cross-section">
          <CrossSectionTemplateEditor
            template={crossSection}
            onTemplateChange={(next) => commit.update(updateCrossSectionTemplate(draft, 0, next))}
          />
        </div>
      )}

      <div className="next-road-editor-block" data-testid="road-editor-line-management">
        <AlignmentManager draft={draft} onDraftChange={commit.apply} />
      </div>

      <div className="next-road-editor-block" data-testid="road-editor-stationing">
        <LinerStationProfilePanel draft={draft} onDraftChange={commit.apply} />
      </div>

      <div className="next-road-editor-block" data-testid="road-editor-crossfall">
        <CrossfallIntervalEditor
          draft={draft}
          intervals={draft.crossSlopeIntervals ?? []}
          onIntervalsChange={(next) => commit.update(updateCrossSlopeIntervals(draft, next))}
        />
      </div>

      <div className="next-road-editor-block" data-testid="road-editor-width">
        <WidthChangePointEditor
          draft={draft}
          widthChangePoints={draft.widthChangePoints ?? []}
          onWidthChangePointsChange={(next) => commit.update(updateWidthChangePoints(draft, next))}
        />
      </div>

      {crossSection && (
        <div className="next-road-editor-block" data-testid="road-editor-superelevation">
          <SuperelevationEditor
            crossSlope={crossSection.crossSlope}
            onCrossSlopeChange={(next) => commit.update(updateCrossSectionCrossSlope(draft, 0, next))}
          />
        </div>
      )}

      <div className="next-road-editor-block" data-testid="road-editor-3d">
        <h3 className="next-hint">3Dプレビュー</h3>
        <div style={{ height: 520, position: "relative" }}>
          <MountainViaduct3dViewer
            draft={draft}
            cameraOverride={roadCameraForDraft(draft)}
            roadHalfWidth={roadHalfWidth}
            layerState={{ terrain: false, superstructure: false, substructure: false, frame: false }}
          />
        </div>
      </div>

      {message !== null && <div className="next-hint" data-testid="road-editor-message">{message}</div>}
    </section>
  );
}
