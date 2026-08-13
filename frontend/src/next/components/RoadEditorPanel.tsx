/**
 * Road Editor Panel (Phase 7.2 FROZEN D-05 / Phase 7.3 WP-G).
 *
 * Rescues the legacy LINER editors into the new Road Module and connects them
 * to the Canonical Road Data (modules.road.data.roadData) via the editor
 * bridge. Any editor change commits atomically to the canonical data
 * (edit -> validate -> atomic canonical commit -> checksum).
 */

import { useMemo, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { ensureRoadData, writeRoadData } from "../modules/roadModuleAdapter";
import { loadRoadEditorDraft, commitRoadEditorDraft } from "../modules/road/roadEditorDraft";
import { updateCrossSectionTemplate, updateVerticalAlignment } from "../modules/road/roadEditorIntegration";
import type { BuildIntermediateInput } from "../../liner/core/pipeline/pipeline";
import { createDefaultLinerDraft } from "../../liner/adapters/linerUiAdapter";
import { HorizontalElementEditor } from "../../liner/components/HorizontalElementEditor";
import { VerticalElementEditor } from "../../liner/components/VerticalElementEditor";
import { CrossSectionTemplateEditor } from "../../liner/components/CrossSectionTemplateEditor";

export interface RoadEditorPanelProps {
  readonly projectId: string;
  readonly featureFlagEnabled?: boolean;
}

export function RoadEditorPanel({ projectId, featureFlagEnabled = true }: RoadEditorPanelProps) {
  const manager = getProjectManager();
  const [draft, setDraft] = useState<BuildIntermediateInput>(() => {
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
  const [message, setMessage] = useState<string | null>(null);

  const verticalAlignment = draft.verticalAlignment;
  const crossSection = Array.isArray(draft.crossSections) ? draft.crossSections[0] : undefined;
  const hasEditor = featureFlagEnabled;

  const commit = useMemo(() => {
    let latest: BuildIntermediateInput = draft;
    return {
      update(next: BuildIntermediateInput): void {
        latest = next;
        setDraft(next);
        const meta = { source: "new" as const, migratedAt: new Date().toISOString() };
        const committed = commitRoadEditorDraft(next, meta);
        if (!committed.ok || !committed.canonical) {
          setMessage("Canonical commit NG（fail-closed）。");
          return;
        }
        const write = writeRoadData(manager, projectId, committed.canonical);
        if (!write.ok) {
          setMessage("Canonical Road Data保存NG（fail-closed）。");
          return;
        }
        setMessage("Canonical Road Dataへ保存しました。");
        void manager.flushPendingSaves();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, manager]);

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

      {message !== null && <div className="next-hint" data-testid="road-editor-message">{message}</div>}
    </section>
  );
}
