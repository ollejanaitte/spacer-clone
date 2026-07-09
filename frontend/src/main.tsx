import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ja } from "./i18n/ja";
import { LobbyApp } from "./lobby/routes";
import "./styles/tokens.css";
import "./styles.css";

function getCurrentLocation(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function Root() {
  const [currentLocation, setCurrentLocation] = useState(() => getCurrentLocation());

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
