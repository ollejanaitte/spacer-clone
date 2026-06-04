import type { AnalysisResult, ProjectModel, SectionKey } from "../types";
import type * as THREE from "three";

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
};

export type ViewerScales = {
  loadScale: number;
  deformationScale: number;
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
};

export type ThreeViewportProps = Viewer3DProps & {
  visibility: ViewerVisibility;
  scales: ViewerScales;
  selectedLoadCaseId: string;
  selection: ViewerSelection;
  fitRequest: number;
  cameraRequest: CameraPreset | null;
  onSelectionChange: (selection: ViewerSelection) => void;
};

export type CameraPreset = "iso" | "xy" | "yz" | "xz";

export type SceneGroups = {
  root: THREE.Group;
  nodes: THREE.Group;
  members: THREE.Group;
  supports: THREE.Group;
  loads: THREE.Group;
  labels: THREE.Group;
  deformed: THREE.Group;
};
