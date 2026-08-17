import { useCallback, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { navigateTo, NEXT_BUSINESS_LIST_PATH, NEXT_PROJECT_HOME_PATH, modulePath } from "../routes";
import type { CanonicalWorkflowStep } from "../../workflow/canonicalWorkflow";
import { SiteContextPage } from "../../workflow/SiteContextPage";

/**
 * Site Context 正式統合ページ（/app 業務Project導線用）。
 *
 * 既存の Site Context 資産（workflow/SiteContextPage）を「ほぼそのまま」導入し、
 * /app 側の Project Data Core（ProjectManager）へ接続する。
 * - Project Data Core 保存Adapter: onProjectChange で overwriteProject により
 *   正規 Save/Load 経路（project.json + backup）へ反映する。
 * - 戻る: 業務Projectトップへ戻る。
 * - 遷移: canonical workflow step → /app module route へマップする。
 */
function mapWorkflowStepToRoute(projectId: string, step: CanonicalWorkflowStep): string | null {
  switch (step.id) {
    case "project":
    case "saveClose":
      return NEXT_BUSINESS_LIST_PATH;
    case "siteContext":
      return modulePath(projectId, "terrain");
    case "road":
      return modulePath(projectId, "road");
    case "bridgePlacement":
      return modulePath(projectId, "bridgeLayout");
    case "superstructure":
      return modulePath(projectId, "superstructure");
    case "substructure":
      return modulePath(projectId, "substructure");
    case "analysis":
      return modulePath(projectId, "analysis");
    case "main3d":
      return modulePath(projectId, "cim");
    case "deliverables":
      return modulePath(projectId, "deliverables");
  }
}

export function SiteContextModuleShellPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState(() => getProjectManager().getProject(projectId));

  const handleProjectChange = useCallback(
    (next: import("../project/schema").Project) => {
      setProject(next);
      const manager = getProjectManager();
      void manager.overwriteProject(next).then((saved) => {
        if (saved) {
          void manager.flushPendingSaves();
        }
      });
    },
    [],
  );

  const handleNavigateStep = useCallback(
    (step: CanonicalWorkflowStep) => {
      const route = mapWorkflowStepToRoute(projectId, step);
      if (route !== null) {
        navigateTo(route);
      }
    },
    [projectId],
  );

  const handleOpenRoadWorkflow = useCallback(() => {
    navigateTo(modulePath(projectId, "road"));
  }, [projectId]);

  const handleBackToApp = useCallback(() => {
    navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`);
  }, [projectId]);

  if (project === undefined) {
    return (
      <section className="next-page" data-testid="site-context-module-page">
        <h1 className="next-page-title">①現況・地理情報 (Site Context)</h1>
        <div className="next-error" data-testid="site-context-module-not-found">
          Projectが見つかりません。
        </div>
        <button
          type="button"
          className="next-link-button"
          onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}
        >
          ← 業務Projectトップへ
        </button>
      </section>
    );
  }

  return (
    <div data-testid="site-context-module-page">
      <div className="next-page-embedded-workflow">
        <SiteContextPage
          project={project}
          onProjectChange={handleProjectChange}
          onBackToApp={handleBackToApp}
          onNavigateStep={handleNavigateStep}
          onOpenRoadWorkflow={handleOpenRoadWorkflow}
        />
      </div>
    </div>
  );
}