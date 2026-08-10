import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  NEXT_BUSINESS_LIST_PATH,
  NEXT_PROJECT_HOME_PATH,
  LEGACY_SYSTEM_PATH,
  navigateTo,
} from "./routes";
import { BusinessListPage } from "./pages/BusinessListPage";
import { ProjectHomePage } from "./pages/ProjectHomePage";
import "./styles.css";

type NextRoute =
  | { kind: "businessList" }
  | { kind: "projectHome"; projectId: string };

function resolveRoute(pathname: string): NextRoute {
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
  if (route.kind === "projectHome") {
    body = <ProjectHomePage projectId={route.projectId} />;
  } else {
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
            data-testid="nav-business-list"
            onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
          >
            業務一覧
          </button>
          <button
            type="button"
            data-testid="nav-legacy"
            title="旧システム（比較・確認用）"
            onClick={() => navigateTo(LEGACY_SYSTEM_PATH)}
          >
            旧システムへ
          </button>
        </nav>
      </header>
      <main className="next-main">{body}</main>
    </div>
  );
}
