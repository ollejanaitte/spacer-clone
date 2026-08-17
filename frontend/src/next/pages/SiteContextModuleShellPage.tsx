import { useCallback, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { navigateTo, NEXT_PROJECT_HOME_PATH, modulePath } from "../routes";
import { SiteContextPage } from "../site-context/SiteContextPage";

/**
 * Site Context 正式統合ページ（/app 業務Project導線用）。
 *
 * 既存の Site Context 資産（next/site-context/SiteContextPage）を導入し、
 * /app 側の Project Data Core（ProjectManager）へ接続する。
 * - Project Data Core 保存Adapter: onProjectChange で現在の /app Project の
 *   識別情報・他Moduleを保持したまま Site Context データ（terrain module /
 *   siteContext metadata）のみをマージし、overwriteProject で正規 Save/Load
 *   経路（project.json + backup）へ反映する（importで別Project化しない）。
 * - 戻る: 業務Projectトップへ戻る。
 * - 遷移: ②線形座標計算へは /app 正規 module route のみ。
 */

const SITE_CONTEXT_METADATA_PREFIX = "siteContext";

/** import で生成される Project から Site Context 関連データのみ抽出して
 *  現在の /app Project へマージする（他Module・Project ID を破壊しない）。 */
function mergeSiteContextIntoProject(
  current: import("../project/schema").Project,
  imported: import("../project/schema").Project,
): import("../project/schema").Project {
  const nextMetadata: Record<string, unknown> = { ...current.metadata };
  for (const [key, value] of Object.entries(imported.metadata ?? {})) {
    if (key.startsWith(SITE_CONTEXT_METADATA_PREFIX) || key === "existingConditions") {
      nextMetadata[key] = value;
    }
  }
  return {
    ...current,
    metadata: nextMetadata,
    modules: {
      ...current.modules,
      terrain: imported.modules.terrain,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function SiteContextModuleShellPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState(() => getProjectManager().getProject(projectId));

  const handleProjectChange = useCallback(
    (next: import("../project/schema").Project) => {
      const manager = getProjectManager();
      const current = manager.getProject(projectId);
      if (current === undefined) {
        return;
      }
      const merged = mergeSiteContextIntoProject(current, next);
      setProject(merged);
      void manager.overwriteProject(merged).then((saved) => {
        if (saved) {
          void manager.flushPendingSaves();
        }
      });
    },
    [projectId],
  );

  const handleOpenRoadModule = useCallback(() => {
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
          onOpenRoadWorkflow={handleOpenRoadModule}
        />
      </div>
    </div>
  );
}