import type { AnalysisResult, ProjectModel } from "../types";
import {
  BRIDGE_NUM_SPANS,
  BRIDGE_PIER_HEIGHT,
  BRIDGE_SOFT_PIERS,
} from "../data/defaultProject";

/**
 * Display-only animation utilities for the 3D viewer.
 *
 * The viewer never mutates the underlying project, supports, or analysis
 * result. Instead it composes a transient displacement vector at frame time:
 *
 *     animatedPosition = originalPosition
 *                        + eigenOrDemoDisplacement * sin(omega * t) * displayScale
 *
 * If the active AnalysisResult already contains an EigenModeShape that we
 * can use, the viewer takes the (ux, uy, uz) of the selected mode and treats
 * it as the displacement vector. Otherwise we synthesize a pseudo mode shape
 * that is biased toward the soft-ground piers so the user can see the
 * difference in sway between rock and soft piers even before running an
 * eigen analysis.
 */

export type AnimationDirection = "longitudinal" | "transverse";

export type AnimationOptions = {
  enabled: boolean;
  /** Selected mode number (1-based). When a real eigen result is available,
   *  this picks the mode shape; otherwise it is informational only. */
  modeNo: number;
  /** Display multiplier applied to the displacement. */
  scale: number;
  /** Animation playback speed multiplier. 1.0 = normal, 2.0 = double. */
  speed: number;
  /** When true, force the demo pseudo-mode even if a real eigen shape exists. */
  useDemo: boolean;
  /** Dominant direction of the pseudo-mode when no eigen shape is available. */
  demoDirection: AnimationDirection;
};

export const DEFAULT_ANIMATION_OPTIONS: AnimationOptions = {
  enabled: false,
  modeNo: 1,
  scale: 5,
  speed: 1,
  useDemo: true,
  demoDirection: "longitudinal",
};

export type DisplacementVector = { ux: number; uy: number; uz: number };

export type EigenShapeLookup = (modeNo: number, nodeId: string) => DisplacementVector | null;

export type AnimatedNodeTransform = {
  nodeId: string;
  original: { x: number; y: number; z: number };
  displacement: { x: number; y: number; z: number };
  phase: number;
};

export type AnimatedNodePosition = { x: number; y: number; z: number };

/**
 * Phase angle derived from the current animation clock.
 *   phase = 2*pi * speed * (elapsedSeconds) mod 2*pi
 *
 * The viewer calls this every frame; passing the same `elapsedSeconds` for
 * all nodes keeps the model rigid.
 */
export function computeAnimationPhase(elapsedSeconds: number, speed: number): number {
  if (!Number.isFinite(elapsedSeconds) || !Number.isFinite(speed)) return 0;
  const wrapped = (elapsedSeconds * Math.max(0, speed)) % 1;
  return wrapped * 2 * Math.PI;
}

/**
 * Pseudo-mode shape that emphasizes horizontal sway on the soft-ground
 * side. The shape is normalized to a unit maximum magnitude so callers
 * can apply their own display scale.
 */
export function computeDemoModeShape(
  project: ProjectModel,
  direction: AnimationDirection = "longitudinal",
): Map<string, DisplacementVector> {
  const map = new Map<string, DisplacementVector>();
  const softPierIds = new Set<string>(BRIDGE_SOFT_PIERS as readonly string[]);
  // The deck nodes (y = pier height) and the pier base nodes.
  const deckNodes = project.nodes.filter(
    (node) => Math.abs(node.y - BRIDGE_PIER_HEIGHT) < 1e-6,
  );
  const baseNodes = project.nodes.filter((node) =>
    node.id === "B1" || node.id === "B2" || node.id === "B3" || node.id === "B4",
  );

  // Soft piers should sway more than rock piers. Use 5x as the relative
  // amplitude ratio so the difference is visible at a glance.
  const softAmplitude = 1.0;
  const rockAmplitude = 0.2;
  const verticalAmplitude = 0.05; // small Y component, kept low intentionally

  // The deck nodes inherit amplitude from the pier they sit on. Decks above
  // soft piers can have larger amplitude than decks above rock piers.
  // Decks above the abutments (G0, G5) take the smaller (rock) value.
  for (const node of deckNodes) {
    const pierId =
      node.id === "G0" || node.id === "G5" ? null : `B${node.id.slice(1)}`;
    const ground = pierId ? (softPierIds.has(pierId) ? "soft" : "rock") : "rock";
    const amplitude = ground === "soft" ? softAmplitude : rockAmplitude;
    map.set(node.id, {
      ux: direction === "longitudinal" ? amplitude : 0,
      uy: 0,
      uz: direction === "transverse" ? amplitude : 0,
    });
  }

  for (const node of baseNodes) {
    const ground = softPierIds.has(node.id) ? "soft" : "rock";
    const amplitude = ground === "soft" ? softAmplitude : rockAmplitude;
    map.set(node.id, {
      ux: direction === "longitudinal" ? amplitude : 0,
      uy: -verticalAmplitude,
      uz: direction === "transverse" ? amplitude : 0,
    });
  }

  // The pseudo-mode also includes a tiny deck vertical breathing pattern so
  // the deck does not look completely frozen when the dominant axis is
  // horizontal.
  for (const node of deckNodes) {
    const current = map.get(node.id) ?? { ux: 0, uy: 0, uz: 0 };
    current.uy +=
      0.05 * Math.sin((node.x / Math.max(1, BRIDGE_NUM_SPANS * 30)) * Math.PI);
    map.set(node.id, current);
  }

  return map;
}

/**
 * Build a single combined displacement map (unit amplitude) for the active
 * mode. When `useDemo === false` and a real eigen result is available, the
 * per-node displacement is taken from the selected eigen mode shape.
 * Otherwise the demo pseudo-mode is returned.
 */
export function resolveAnimationDisplacementMap(
  project: ProjectModel,
  options: AnimationOptions,
  result?: AnalysisResult | null,
  selectedEigenMode?: number,
): Map<string, DisplacementVector> {
  if (!options.useDemo && result?.eigenResult) {
    const modeNo = selectedEigenMode ?? options.modeNo;
    const mode = result.eigenResult.modes.find((m) => m.modeNo === modeNo);
    if (mode && mode.shape.length > 0) {
      const map = new Map<string, DisplacementVector>();
      for (const shape of mode.shape) {
        map.set(shape.nodeId, { ux: shape.ux, uy: shape.uy, uz: shape.uz });
      }
      if (map.size > 0) return map;
    }
  }
  return computeDemoModeShape(project, options.demoDirection);
}

/**
 * Display-only animated node coordinates. Returns a map of
 * nodeId -> the position the renderer should display this frame. The
 * original `project.nodes` array is never mutated; callers pass the
 * returned map into the renderer in place of the default node map.
 *
 * When `options.enabled` is false, the clock is null/NaN, or the active
 * displacement map is empty, the original coordinates are returned
 * unchanged so the same code path works with or without animation.
 *
 *   animated = original + displacement * sin(phase) * scale
 *
 *   phase = 2*pi*speed*elapsedSeconds  (wrapped mod 2*pi)
 */
export function withNodeDisplacement(
  project: ProjectModel,
  options: AnimationOptions,
  clockSeconds: number | null | undefined,
  result?: AnalysisResult | null,
  selectedEigenMode?: number,
): Map<string, AnimatedNodePosition> {
  const map = new Map<string, AnimatedNodePosition>();
  for (const node of project.nodes) {
    map.set(node.id, { x: node.x, y: node.y, z: node.z });
  }
  if (!options.enabled) return map;
  if (clockSeconds === null || clockSeconds === undefined) return map;
  if (!Number.isFinite(clockSeconds)) return map;

  const displacementMap = resolveAnimationDisplacementMap(project, options, result, selectedEigenMode);
  if (displacementMap.size === 0) return map;

  const phase = computeAnimationPhase(clockSeconds, options.speed);
  const sinPhase = Math.sin(phase);
  const factor = sinPhase * options.scale;
  if (factor === 0) return map;

  for (const node of project.nodes) {
    const disp = displacementMap.get(node.id);
    if (!disp) continue;
    map.set(node.id, {
      x: node.x + disp.ux * factor,
      y: node.y + disp.uy * factor,
      z: node.z + disp.uz * factor,
    });
  }
  return map;
}

/**
 * Per-node animated transform. Returns the position the viewer should
 * render this frame, plus the contributing factors for diagnostics.
 *
 *   animated = original + displacement * sin(phase) * scale
 */
export function computeAnimatedTransform(
  nodeId: string,
  original: { x: number; y: number; z: number },
  displacement: { x: number; y: number; z: number },
  phase: number,
  scale: number,
): AnimatedNodeTransform {
  const sinPhase = Math.sin(phase);
  const factor = sinPhase * scale;
  return {
    nodeId,
    original,
    displacement: {
      x: displacement.x * factor,
      y: displacement.y * factor,
      z: displacement.z * factor,
    },
    phase,
  };
}
