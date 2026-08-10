import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  NEXT_BUSINESS_LIST_PATH,
  NEXT_HOME_PATH,
  NEXT_PROJECT_HOME_PATH,
  NEXT_QUICK_PATH,
  navigateTo,
} from "./routes";
import { HomePage } from "./pages/HomePage";
import { BusinessListPage } from "./pages/BusinessListPage";
import { ProjectHomePage } from "./pages/ProjectHomePage";
import { QuickAnalysisPage } from "./pages/QuickAnalysisPage";
import "./styles.css";

type NextRoute =
  | { kind: "home" }
  | { kind: "businessList" }
  | { kind: "projectHome"; projectId: string }
  | { kind: "quick" };

function resolveRoute(pathname: string): NextRoute {
  if (pathname === NEXT_HOME_PATH) {
    return { kind: "home" };
  }
  if (pathname === NEXT_QUICK_PATH || pathname.startsWith(`${NEXT_QUICK_PATH}/`)) {
    return { kind: "quick" };
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
    case "projectHome":
      body = <ProjectHomePage projectId={route.projectId} />;
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
