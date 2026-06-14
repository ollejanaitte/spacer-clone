import type { BridgeFemResponse, BridgeProject, ViewerModelPayload } from "./types";

function buildBaseUrl(): string {
  if (typeof window === "undefined") return "";
  // Match existing client: when running from file:// use absolute backend origin.
  if (window.location?.protocol === "file:" ) {
    return "http://127.0.0.1:8000";
  }
  return "";
}

export async function fetchBridgeTemplate(): Promise<BridgeProject> {
  const base = buildBaseUrl();
  const res = await fetch(`${base}/api/bridge/template`);
  if (!res.ok) throw new Error(`template fetch failed: ${res.status}`);
  const data = await res.json();
  return data.project as BridgeProject;
}

export async function createBridge(bridge: BridgeProject): Promise<BridgeProject> {
  const base = buildBaseUrl();
  const res = await fetch(`${base}/api/bridge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: bridge.id, project: bridge }),
  });
  if (!res.ok) {
    throw new Error(`create bridge failed: ${res.status}`);
  }
  const data = await res.json();
  return data.project as BridgeProject;
}

export async function getBridge(bridgeId: string): Promise<BridgeProject> {
  const base = buildBaseUrl();
  const res = await fetch(`${base}/api/bridge/${encodeURIComponent(bridgeId)}`);
  if (!res.ok) throw new Error(`get bridge failed: ${res.status}`);
  const data = await res.json();
  return data.project as BridgeProject;
}

export async function updateBridge(bridge: BridgeProject): Promise<BridgeProject> {
  const base = buildBaseUrl();
  const res = await fetch(`${base}/api/bridge/${encodeURIComponent(bridge.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: bridge }),
  });
  if (!res.ok) throw new Error(`update bridge failed: ${res.status}`);
  const data = await res.json();
  return data.project as BridgeProject;
}

export async function deleteBridge(bridgeId: string): Promise<void> {
  const base = buildBaseUrl();
  const res = await fetch(`${base}/api/bridge/${encodeURIComponent(bridgeId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`delete bridge failed: ${res.status}`);
  }
}

export async function generateFem(
  bridge: BridgeProject,
  runAnalysis = false,
): Promise<BridgeFemResponse> {
  const base = buildBaseUrl();
  const res = await fetch(`${base}/api/fem/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bridge, runAnalysis }),
  });
  if (!res.ok) {
    let message = `fem generate failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail?.message) message = data.detail.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await res.json()) as BridgeFemResponse;
}

export async function fetchViewerModel(bridgeId: string): Promise<ViewerModelPayload> {
  const base = buildBaseUrl();
  const res = await fetch(`${base}/api/viewer/bridge/${encodeURIComponent(bridgeId)}`);
  if (!res.ok) throw new Error(`viewer fetch failed: ${res.status}`);
  return (await res.json()) as ViewerModelPayload;
}
