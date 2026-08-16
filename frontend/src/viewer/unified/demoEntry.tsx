import { createRoot } from "react-dom/client";
import { UnifiedViewerDemo } from "./UnifiedViewerDemo";

/**
 * Standalone entry for the unified viewer demo page (frontend/unified-viewer-demo.html).
 * Renders the REAL Reference Business 001 scene: terrain + road + superstructure +
 * bearings + substructure + existing conditions in one shared coordinate frame.
 * Production route uses real data (realScene.ts); mocks are confined to tests only.
 */
const host = document.getElementById("root");
if (host) {
  createRoot(host).render(<UnifiedViewerDemo />);
}