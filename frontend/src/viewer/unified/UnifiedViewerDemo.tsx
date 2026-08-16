import { useCallback, useMemo, useRef, useState } from "react";
import { createMockUnifiedScene } from "../layers/mock/mockScene";
import type { LayerSelection, UnifiedViewerModel } from "../layers/layerContract";
import { UnifiedViewer, type UnifiedViewerHandle } from "./UnifiedViewer";
import { LayerVisibilityPanel } from "./LayerVisibilityPanel";

/**
 * Wave 1 demo harness for the unified 3D viewer.
 *
 * Assembles the mock unified scene and wires the minimal controls
 * (layer ON/OFF, fit, selection status). Lane U mounts this component in a
 * route/page in a later wave; the standalone demo page
 * (public/unified-viewer-demo.html) exercises it for Wave 1 evidence.
 */
export function UnifiedViewerDemo() {
  const model = useMemo<UnifiedViewerModel>(() => createMockUnifiedScene(), []);
  const viewerRef = useRef<UnifiedViewerHandle>(null);
  const initialVisibility = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const layer of model.layers) map[layer.id] = layer.visible;
    return map;
  }, [model]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>(initialVisibility);
  const [selection, setSelection] = useState<LayerSelection>(null);

  const handleToggle = useCallback((layerId: string, visible: boolean) => {
    setVisibility((current) => ({ ...current, [layerId]: visible }));
    viewerRef.current?.setLayerVisible(layerId, visible);
  }, []);

  const handleFit = useCallback(() => {
    viewerRef.current?.fitToScene();
  }, []);

  const handleSelectionChange = useCallback((next: LayerSelection) => {
    setSelection(next);
  }, []);

  return (
    <div className="unified-viewer-demo" data-testid="unified-viewer-demo">
      <UnifiedViewer
        ref={viewerRef}
        model={model}
        showGrid
        onSelectionChange={handleSelectionChange}
        className="unified-viewer-demo-canvas"
      />
      <LayerVisibilityPanel
        layers={model.layers}
        visibility={visibility}
        onToggle={handleToggle}
        onFit={handleFit}
      />
      <div className="unified-viewer-demo-status" data-testid="unified-viewer-selection">
        {selection ? `${selection.layerId} / ${selection.entityId}` : "no selection"}
      </div>
    </div>
  );
}