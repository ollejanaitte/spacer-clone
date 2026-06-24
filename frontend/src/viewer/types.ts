import type { SpacerAxisSwap } from "./coordinateTransform";
import type { AnimationOptions } from "./animation";
import type { AnalysisResult, ProjectModel, SectionKey } from "../types";
import type { ResponseSpectrumSelection } from "../results/resultViewModel";
import type * as THREE from "three";
import type { ViewerDisplaySizeSettings } from "./settings/displaySize";
import type { ForceColorComponent, ForceColorValueType, ForceColorModeData } from "./memberForceColorMap";

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
  shearQy?: boolean;
  shearQz?: boolean;
  reactionLabels?: boolean;
  reactionLabelFx?: boolean;
  reactionLabelFy?: boolean;
  reactionLabelFz?: boolean;
  reactionLabelMx?: boolean;
  reactionLabelMy?: boolean;
  reactionLabelMz?: boolean;
  memberForceLabels?: boolean;
  memberForceLabelFx?: boolean;
  memberForceLabelFy?: boolean;
  memberForceLabelFz?: boolean;
  memberForceLabelMx?: boolean;
  memberForceLabelMy?: boolean;
  memberForceLabelMz?: boolean;
  /** @deprecated use memberForceLabels. Kept as migration fallback for Phase1 state. */
  axialForceLabels?: boolean;
  momentMy: boolean;
  momentMz: boolean;
  memberForceColorMap?: boolean;
  forceColorComponent?: ForceColorComponent;
  forceColorValueType?: ForceColorValueType;
};

export type ViewerScales = {
  loadScale: number;
  deformationScale: number;
  modeScale: number;
  resultScale: number;
  nodeSize: number;
  labelSize: number;
  supportSize?: number;
  loadArrowSize?: number;
  memberLineWidth?: number;
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
   * Optional time-history deformation override. When set and the
   * 3D viewer is rendering, the override takes priority over the
   * eigen / demo animation. The override is computed by the time
   * history animation layer and never mutates the project payload.
   */
  timeHistoryNodeOverride?: Map<string, { x: number; y: number; z: number }> | null;
  /**
   * Optional second bridge project shown side-by-side in Compare mode.
   * The default CompareShell uses it to render the B-plan (suspended
   * deck) alongside the primary project.
   */
  compareProject?: ProjectModel | null;
  /**
   * Optional right-side (Plan B) analysis result, used by Compare View to
   * display independent metrics. When omitted, the right slot renders
   * its model only with placeholder values.
   */
  rightResult?: AnalysisResult | null;
  /** Initial state for the compare-mode toggle. */
  initialCompareMode?: boolean;
  /** When false, the camera-sync checkbox defaults to off. */
  defaultCameraSync?: boolean;
  displaySizeSettings?: ViewerDisplaySizeSettings;
  onDisplaySizeSettingsChange?: (settings: ViewerDisplaySizeSettings) => void;
  /** When false, the right-side View controls drawer is collapsed and only an open button is rendered. */
  viewPanelOpen?: boolean;
  /** Called when the user clicks the open/close toggle on the View controls drawer. */
  onViewPanelToggle?: () => void;
  /** Called when the user clicks the fit-to-view button inside ViewerControls. */
  onFitRequest?: () => void;
};

export type ThreeViewportProps = Omit<Viewer3DProps, "onSpacerAxisSwapChange" | "onAnimationOptionsChange"> & {
  visibility: ViewerVisibility;
  scales: ViewerScales;
  selectedLoadCaseId: string;
  fitRequest: number;
  cameraRequest: CameraPreset | null;
  spacerAxisSwap?: SpacerAxisSwap;
  animationOptions?: AnimationOptions;
  /**
   * When set, the viewport uses this value (in seconds) as the animation
   * clock instead of performance.now(). Two viewports can be driven by
   * the same clock from a parent (e.g. CompareView) for synced animation.
   */
  externalAnimationClockSeconds?: number | null;
  /** Available eigen mode numbers. When present, the renderer can show
   *  the mode picker and prefers real shapes over the demo pseudo-mode. */
  eigenModeNos?: number[];
  /** Display color mode for nodes/members. Default: "auto". */
  memberColorMode?: import("./colorCoding").MemberColorMode;
  onSpacerAxisSwapChange?: (swap: SpacerAxisSwap) => void;
  onAnimationOptionsChange?: (options: import("./animation").AnimationOptions) => void;
  onInitializationError: (error: unknown) => void;
  forceColorMode?: ForceColorModeData;
};

export const defaultVisibility: ViewerVisibility = {
  nodes: true,
  members: true,
  supports: true,
  loads: true,
  labels: true,
  nodeLabels: true,
  memberLabels: true,
  grid: true,
  axes: true,
  deformedShape: false,
  reactions: false,
  axialForce: false,
  shearQy: false,
  shearQz: false,
  reactionLabels: false,
  reactionLabelFx: true,
  reactionLabelFy: true,
  reactionLabelFz: true,
  reactionLabelMx: false,
  reactionLabelMy: false,
  reactionLabelMz: false,
  memberForceLabels: false,
  memberForceLabelFx: true,
  memberForceLabelFy: false,
  memberForceLabelFz: false,
  memberForceLabelMx: false,
  memberForceLabelMy: false,
  memberForceLabelMz: false,
  axialForceLabels: false,
  momentMy: false,
  momentMz: false,
  memberForceColorMap: false,
  forceColorComponent: "N",
  forceColorValueType: "absMax",
};

export const defaultScales: ViewerScales = {
  loadScale: 1,
  deformationScale: 120,
  modeScale: 1,
  resultScale: 1,
  nodeSize: 0.075,
  labelSize: 0.26,
  supportSize: 1,
  loadArrowSize: 1,
  memberLineWidth: 1,
};

/**
 * Snapshot of the current camera state, used to keep multiple
 * ThreeViewport instances in sync (left drives right in CompareView).
 */
export type CameraStateSnapshot = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  fov: number;
};

/**
 * Imperative handle exposed by ThreeViewport so the parent (CompareView)
 * can read/write the camera state without going through React state.
 */
export type ThreeViewportHandle = {
  getCameraState: () => CameraStateSnapshot | null;
  applyCameraState: (state: CameraStateSnapshot) => void;
  fitToProject: () => void;
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
