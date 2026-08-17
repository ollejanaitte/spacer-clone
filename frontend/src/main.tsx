import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ja } from "./i18n/ja";
import { NextApp } from "./next/NextApp";
import { isNextAppPath, NEXT_HOME_PATH } from "./next/routes";
import "./styles/tokens.css";
import "./styles.css";

/**
 * 通常製品の Root Shell は /app (NextApp) の1本のみ。
 *
 * - packaged Electron (file://index.html) は pathname が /app に一致しないため
 *   canonical home (/app) として扱う。
 * - /app 以外の深いリンク (/pro, /, /learn, /level0, 旧deep-link 等) は
 *   canonical /app へ正規化し、別App Shell (App / Lobby) へ振り分けない。
 */
function getCurrentLocation(): string {
  if (typeof window === "undefined") return "/app";
  if (window.location.protocol === "file:") {
    return "/app";
  }
  return `${window.location.pathname}${window.location.search}`;
}

function Root() {
  const currentLocation = getCurrentLocation();
  if (!isNextAppPath(currentLocation)) {
    // replaceState は history エントリを増やさない。
    window.history.replaceState({}, "", NEXT_HOME_PATH);
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