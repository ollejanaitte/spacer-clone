import { createRoot } from "react-dom/client";
import { UnifiedViewerDemo } from "./UnifiedViewerDemo";

/**
 * Standalone entry for the Wave 1 demo page (frontend/unified-viewer-demo.html).
 * Renders the mock unified scene skeleton: terrain + road + superstructure +
 * bearings + substructure + existing conditions in one shared coordinate frame.
 */
const host = document.getElementById("root");
if (host) {
  createRoot(host).render(<UnifiedViewerDemo />);
}