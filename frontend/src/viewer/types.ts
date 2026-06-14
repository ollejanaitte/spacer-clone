import type { AnalysisResult, ProjectModel, SectionKey } from "../types";
import type { ResponseSpectrumSelection } from "../results/resultViewModel";
import type { ViewerCoordinateMode } from "./coordinateTransform";
import type * as THREE from "three";

export type ViewerMode = "three" | "fallback2d";

export type ViewerVisibility = {
  nodes: boolean;
  members: boolean;
  supports: boolean;
  loads: boolean;
  labels: boolean;
  nodeLabels: boolean;
  memberLabels: boolean;
  grid: boolean;
  axes: boolean;
  deformedShape: boolean;
  reactions: boolean;
  axialForce: boolean;
  momentMy: boolean;
  momentMz: boolean;
};

export type ViewerScales = {
  loadScale: number;
  deformationScale: number;
  modeScale: number;
  resultScale: number;
  nodeSize: number;
  labelSize: number;
};

export type ViewerSelection =
  | { type: "node"; id: string }
  | { type: "member"; id: string }
  | null;

export type Viewer3DProps = {
  project: ProjectModel;
  result: AnalysisResult | null;
  selectedSection: SectionKey;
  selection: ViewerSelection;
  activeLoadCase: string;
  selectedEigenMode?: number;
  selectedResponseSpectrumResult?: ResponseSpectrumSelection;
  onSelectionChange: (selection: ViewerSelection) => void;
  onActiveLoadCaseChange: (loadCaseId: string) => void;
  onSelectedEigenModeChange?: (modeNo: number) => void;
  onSelectedResponseSpectrumResultChange?: (resultKey: ResponseSpectrumSelection) => void;
  onViewerError?: (message: string) => void;
  /**
   * 表示専用の座標モード。Viewer 描画時にだけ Y/Z を入れ替える。
   * モデルデータ・解析結果・保存 JSON には一切影響しない。
   */
  coordinateMode?: ViewerCoordinateMode;
};

export type ThreeViewportProps = Viewer3DProps & {
  visibility: ViewerVisibility;
  scales: ViewerScales;
  selectedLoadCaseId: string;
  fitRequest: number;
  cameraRequest: CameraPreset | null;
  onInitializationError: (error: unknown) => void;
  coordinateMode: ViewerCoordinateMode;
};

export type CameraPreset = "iso" | "xy" | "yz" | "xz";

export type SceneGroups = {
  root: THREE.Group;
  nodes: THREE.Group;
  members: THREE.Group;
  supports: THREE.Group;
  loads: THREE.Group;
  resultDiagrams: THREE.Group;
  labels: THREE.Group;
  deformed: THREE.Group;
};
