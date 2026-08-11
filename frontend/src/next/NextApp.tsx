import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  NEXT_BUSINESS_LIST_PATH,
  NEXT_HOME_PATH,
  NEXT_NEW_PROJECT_PATH,
  NEXT_PROJECT_HOME_PATH,
  NEXT_QUICK_PATH,
  isNewProjectPath,
  isEditProjectPath,
  parseEditProjectId,
  navigateTo,
} from "./routes";
import { HomePage } from "./pages/HomePage";
import { BusinessListPage } from "./pages/BusinessListPage";
import { ProjectTopPage } from "./pages/ProjectTopPage";
import { QuickAnalysisPage } from "./pages/QuickAnalysisPage";
import { NewProjectPage } from "./pages/NewProjectPage";
import { EditProjectPage } from "./pages/EditProjectPage";
import { LoadBusinessPage } from "./pages/LoadBusinessPage";
import { SaveStatusIndicator } from "./components/SaveStatusIndicator";
import "./styles.css";

type NextRoute =
  | { kind: "home" }
  | { kind: "businessList" }
  | { kind: "newProject" }
  | { kind: "editProject"; projectId: string }
  | { kind: "projectHome"; projectId: string }
  | { kind: "quick" }
  | { kind: "load" };

function resolveRoute(pathname: string): NextRoute {
  if (pathname === NEXT_HOME_PATH) {
    return { kind: "home" };
  }
  if (pathname === NEXT_QUICK_PATH || pathname.startsWith(`${NEXT_QUICK_PATH}/`)) {
    return { kind: "quick" };
  }
  if (isNewProjectPath(pathname)) {
    return { kind: "newProject" };
  }
  if (pathname === "/app/business/load") {
    return { kind: "load" };
  }
  if (isEditProjectPath(pathname)) {
    const projectId = parseEditProjectId(pathname);
    if (projectId !== undefined) {
      return { kind: "editProject", projectId };
    }
  }
  if (pathname.startsWith(`${NEXT_PROJECT_HOME_PATH}/`)) {
    return { kind: "projectHome", projectId: pathname.slice(NEXT_PROJECT_HOME_PATH.length + 1) };
  }
  return { kind: "businessList" };
}

export function NextApp() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const route = resolveRoute(pathname);

  let body: ReactNode;
  switch (route.kind) {
    case "home":
      body = <HomePage />;
      break;
    case "quick":
      body = <QuickAnalysisPage />;
      break;
    case "newProject":
      body = <NewProjectPage />;
      break;
    case "editProject":
      body = <EditProjectPage projectId={route.projectId} />;
      break;
    case "projectHome":
      body = <ProjectTopPage projectId={route.projectId} />;
      break;
    case "load":
      body = <LoadBusinessPage />;
      break;
    default:
      body = <BusinessListPage />;
  }

  return (
    <div className="next-app" data-testid="next-app">
      <header className="next-header">
        <div className="next-brand" data-testid="next-brand">
          新統合システム <span className="next-brand-sub">Project System</span>
        </div>
        <SaveStatusIndicator />
        <nav className="next-nav">
          <button
            type="button"
            data-testid="nav-home"
            onClick={() => navigateTo(NEXT_HOME_PATH)}
          >
            ホーム
          </button>
          <button
            type="button"
            data-testid="nav-business-list"
            onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
          >
            業務一覧
          </button>
        </nav>
      </header>
      <main className="next-main">{body}</main>
    </div>
  );
}
