import { ArrowLeft, List, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import type { LinerDraft } from "../adapters/linerUiAdapter";
import { MountainViaduct3dViewer } from "../samples/mountain-viaduct-500/viewer";
import { MOUNTAIN_CAMERA_PRESETS } from "../samples/mountain-viaduct-500/fixture";
import { SUPPORT_IDS, selectionLabel, type SceneSelection } from "../samples/mountain-viaduct-500/selection";
import {
  VIEWER_MODEL_MODES,
  layerLabel,
  layerStateForMode,
  modelModeLabel,
  toggleLayer,
  type ViewerLayerState,
  type ViewerModelMode,
} from "../samples/mountain-viaduct-500/viewerSwitch";
import type { SceneLayer } from "../samples/mountain-viaduct-500/scene";

export type LinerMain3DPageProps = {
  draft: LinerDraft;
  onClose: () => void;
  onBackToSetup: () => void;
  onBackToPreview: () => void;
  onBackToList: () => void;
};

const LAYER_ORDER: SceneLayer[] = [
  "terrain",
  "road",
  "superstructure",
  "substructure",
  "frame",
];

export function LinerMain3DPage({
  draft,
  onClose,
  onBackToSetup,
  onBackToPreview,
  onBackToList,
}: LinerMain3DPageProps) {
  const [presetId, setPresetId] = useState("valley");
  const [mode, setMode] = useState<ViewerModelMode>("integrated");
  const [selection, setSelection] = useState<SceneSelection>(null);
  const [layers, setLayers] = useState<ViewerLayerState>(
    layerStateForMode("integrated"),
  );

  const sceneLayers = useMemo(() => {
    if (mode === "custom") {
      return layers;
    }
    return layerStateForMode(mode);
  }, [mode, layers]);

  const selectedSupportId = selection && selection.kind === "support" ? selection.id : undefined;

  const handleMode = (next: (typeof VIEWER_MODEL_MODES)[number]) => {
    setMode(next);
    setLayers(layerStateForMode(next));
  };

  const handleToggle = (layer: SceneLayer) => {
    setMode("custom");
    setLayers((prev) => toggleLayer(prev, layer));
  };

  return (
    <main className="liner-main3d-page" data-testid="liner-main3d-page">
      <header className="liner-main3d-header">
        <div>
          <h1>統合3D表示（山岳連続高架橋500m）</h1>
          <p>地形・道路・上部工・下部工・骨組みを同一シーンで表示</p>
        </div>
        <div className="liner-main3d-header-actions">
          <button type="button" onClick={onClose} data-testid="close-liner-main3d">
            <ArrowLeft size={16} />
            閉じる
          </button>
          <button type="button" onClick={onBackToPreview} data-testid="main3d-back-to-preview">
            <Pencil size={16} />
            プレビューへ戻る
          </button>
          <button type="button" onClick={onBackToSetup} data-testid="main3d-back-to-setup">
            <Pencil size={16} />
            入力へ戻る
          </button>
          <button type="button" onClick={onBackToList} data-testid="main3d-back-to-list">
            <List size={16} />
            一覧へ戻る
          </button>
        </div>
      </header>

      <div className="liner-main3d-toolbar">
        <fieldset className="liner-main3d-modes">
          <legend>表示モデル</legend>
          {VIEWER_MODEL_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? "active" : undefined}
              onClick={() => handleMode(m)}
              data-testid={`main3d-mode-${m}`}
            >
              {modelModeLabel(m)}
            </button>
          ))}
        </fieldset>

        <fieldset className="liner-main3d-layers">
          <legend>レイヤー</legend>
          {LAYER_ORDER.map((layer) => (
            <label key={layer} className="liner-main3d-layer">
              <input
                type="checkbox"
                checked={sceneLayers[layer]}
                onChange={() => handleToggle(layer)}
                data-testid={`main3d-layer-${layer}`}
              />
              {layerLabel(layer)}
            </label>
          ))}
        </fieldset>

        <fieldset className="liner-main3d-cameras">
          <legend>カメラ</legend>
          {MOUNTAIN_CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={presetId === preset.id ? "active" : undefined}
              onClick={() => setPresetId(preset.id)}
              data-testid={`main3d-camera-${preset.id}`}
            >
              {preset.label}
            </button>
          ))}
        </fieldset>

        <fieldset className="liner-main3d-selection">
          <legend>選択（下部工）</legend>
          <span className="liner-main3d-selection-current" data-testid="main3d-selection-current">
            {selectionLabel(selection)}
          </span>
          <div className="liner-main3d-selection-options">
            {SUPPORT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={selectedSupportId === id ? "active" : undefined}
                onClick={() =>
                  setSelection((prev) =>
                    prev && prev.kind === "support" && prev.id === id ? null : { kind: "support", id },
                  )
                }
                data-testid={`main3d-select-${id}`}
              >
                {id}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <MountainViaduct3dViewer
        draft={draft}
        presetId={presetId}
        layerState={sceneLayers}
        selectedSupportId={selectedSupportId}
      />
    </main>
  );
}
