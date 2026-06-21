import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { LobbyApp } from "./lobby/routes";
import "./styles/tokens.css";
import "./styles.css";

function getInitialRoute(): "lobby" | "pro" {
  if (typeof window === "undefined") return "lobby";
  const p = window.location.pathname;
  if (p === "/pro" || p.startsWith("/pro/")) return "pro";
  return "lobby";
}

function Root() {
  const [route, setRoute] = useState<"lobby" | "pro">(() => getInitialRoute());

  const handleNavigate = useCallback((path: string) => {
    window.history.pushState({}, "", path);
    if (path === "/pro" || path.startsWith("/pro/")) {
      setRoute("pro");
    } else {
      setRoute("lobby");
    }
  }, []);

  // Listen for popstate (back/forward)
  React.useEffect(() => {
    const onPopState = () => {
      const p = window.location.pathname;
      setRoute(p === "/pro" || p.startsWith("/pro/") ? "pro" : "lobby");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (route === "pro") {
    return <App />;
  }
  return <LobbyApp onNavigate={handleNavigate} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
