import { UNIFIED_LAYER_LABELS } from "../layers/layerContract";
import type { ViewerLayer } from "../layers/layerContract";

export interface LayerVisibilityPanelProps {
  readonly layers: readonly ViewerLayer[];
  readonly visibility: Record<string, boolean>;
  readonly onToggle: (layerId: string, visible: boolean) => void;
  readonly onFit: () => void;
}

/**
 * Minimal Wave 1 layer ON/OFF control. Lane U owns the final UI/UX; this
 * skeleton only proves the visibility toggle contract.
 */
export function LayerVisibilityPanel({
  layers,
  visibility,
  onToggle,
  onFit,
}: LayerVisibilityPanelProps) {
  return (
    <div className="unified-viewer-layer-panel" data-testid="unified-layer-panel">
      <div className="unified-viewer-layer-panel-title">Layers</div>
      {layers.map((layer) => {
        const label =
          (layer.metadata?.label as string | undefined) ?? UNIFIED_LAYER_LABELS[layer.kind];
        return (
          <label key={layer.id} className="unified-viewer-layer-row" data-testid={`layer-toggle-${layer.id}`}>
            <input
              type="checkbox"
              checked={visibility[layer.id] ?? layer.visible}
              onChange={(event) => onToggle(layer.id, event.target.checked)}
              data-testid={`layer-checkbox-${layer.id}`}
            />
            <span>{label}</span>
          </label>
        );
      })}
      <button type="button" data-testid="unified-fit-button" onClick={onFit}>
        Fit
      </button>
    </div>
  );
}