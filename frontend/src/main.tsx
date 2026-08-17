import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ja } from "./i18n/ja";
import { LobbyApp } from "./lobby/routes";
import { NextApp } from "./next/NextApp";
import { isNextAppPath } from "./next/routes";
import { redirectLegacyRoutes } from "./timeHistory/routeRedirect";
import "./styles/tokens.css";
import "./styles.css";

function getCurrentLocation(): string {
  if (typeof window === "undefined") return "/app";
  // G-5: packaged Electron は file://index.html をロードする (pathname が
  // /app にも /pro にも一致しない)。この場合 production App の canonical
  // entry (/app) へ向ける。dev (http) では pathname をそのまま使う。
  if (window.location.protocol === "file:") {
    return "/app";
  }
  return `${window.location.pathname}${window.location.search}`;
}

function Root() {
  const [currentLocation, setCurrentLocation] = useState(() => {
    // レガシー deep-link (/th/run, /compare 等) は App 内部の redirectLegacyRoutes()
    // が到達不可能なため、ルーティング判定前にここで正規パス (/pro/*) へ置換する。
    // replaceState は history エントリを増やさない。
    if (typeof window !== "undefined") {
      redirectLegacyRoutes();
    }
    return getCurrentLocation();
  });

  const handleNavigate = useCallback((path: string) => {
    window.history.pushState({}, "", path);
    setCurrentLocation(getCurrentLocation());
  }, []);

  // Listen for popstate (back/forward)
  React.useEffect(() => {
    const onPopState = () => setCurrentLocation(getCurrentLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (isNextAppPath(currentLocation)) {
    return <NextApp />;
  }
  if (currentLocation === "/pro" || currentLocation.startsWith("/pro/")) {
    return <App />;
  }
  return <LobbyApp onNavigate={handleNavigate} currentLocation={currentLocation} />;
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
