import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { LobbyApp } from "./lobby/routes";
import "./styles/tokens.css";
import "./styles.css";

function getRoute(): "lobby" | "pro" {
  if (typeof window === "undefined") return "lobby";
  const p = window.location.pathname;
  if (p === "/pro" || p.startsWith("/pro/")) return "pro";
  return "lobby";
}

const route = getRoute();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {route === "pro" ? <App /> : <LobbyApp />}
  </React.StrictMode>,
);
