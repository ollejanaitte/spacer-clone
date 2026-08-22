import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ja } from "./i18n/ja";
import { NextApp } from "./next/NextApp";
import { isLegacyProPath, isNextAppPath, NEXT_HOME_PATH } from "./next/routes";
import { redirectLegacyRoutes } from "./timeHistory/routeRedirect";
import "./styles/tokens.css";
import "./styles.css";

/**
 * Root Shell:
 * - canonical 入口は /app (NextApp) の1本。
 * - /pro はレガシー (旧クラシック UI) 入口。ホーム画面の「レガシーモードを開く」から進入する。
 * - packaged Electron (file://index.html) は pathname が /app にも /pro にも一致しないため
 *   canonical home (/app) として扱う。
 */
function getCurrentLocation(): string {
  if (typeof window === "undefined") return "/app";
  if (window.location.protocol === "file:") {
    return "/app";
  }
  return `${window.location.pathname}${window.location.search}`;
}

function Root() {
  const [currentLocation, setCurrentLocation] = useState(() => {
    // レガシー deep-link (/th/run, /compare 等) はルーティング判定前に
    // 正規パス (/pro/*) へ置換する。replaceState は history エントリを増やさない。
    if (typeof window !== "undefined") {
      redirectLegacyRoutes();
    }
    return getCurrentLocation();
  });

  // Listen for popstate (back/forward, navigateTo)
  useEffect(() => {
    const onPopState = () => setCurrentLocation(getCurrentLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (!isNextAppPath(currentLocation) && !isLegacyProPath(currentLocation)) {
    // replaceState は history エントリを増やさない。
    window.history.replaceState({}, "", NEXT_HOME_PATH);
    return <NextApp />;
  }
  if (isLegacyProPath(currentLocation)) {
    return <App />;
  }
  return <NextApp />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={(
        <main role="alert">
          <p>{ja.common.unexpectedError}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {ja.common.reload}
          </button>
        </main>
      )}
    >
      <Root />
    </ErrorBoundary>
  </React.StrictMode>,
);
