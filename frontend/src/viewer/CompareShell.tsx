import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, ProjectModel } from "../types";
import { ComparisonPanel } from "./ComparisonPanel";
import {
  describeBridgeVariant,
  type BridgeVariantInfo,
} from "../data/defaultProject";
import {
  DEFAULT_ANIMATION_OPTIONS,
  type AnimationOptions,
} from "./animation";
import { ThreeViewport } from "./ThreeViewport";
import { type CameraStateSnapshot, type ThreeViewportHandle } from "./types";
import {
  defaultScales,
  defaultVisibility,
  type ThreeViewportProps,
  type ViewerScales,
  type ViewerSelection,
  type ViewerVisibility,
} from "./types";

export type CompareSlotDescriptor = {
  id: string;
  label: string;
  caption: string;
  project: ProjectModel;
};

export type CompareShellProps = {
  slots: CompareSlotDescriptor[];
  /** Analysis result for the left slot (Plan A). */
  leftResult: AnalysisResult | null;
  /** Analysis result for the right slot (Plan B). May be null before Run Eigen. */
  rightResult: AnalysisResult | null;
  selectedSection: ThreeViewportProps["selectedSection"];
  selection: ViewerSelection;
  activeLoadCase: string;
  eigenModeNos: number[];
  selectedEigenMode: number;
  selectedResponseSpectrumResult: ThreeViewportProps["selectedResponseSpectrumResult"];
  spacerAxisSwap: ThreeViewportProps["spacerAxisSwap"];
  animationOptions: AnimationOptions;
  /** When true, orbit / pan / zoom on either side propagates to the other. */
  cameraSync?: boolean;
  onSelectionChange: (slotId: string, selection: ViewerSelection) => void;
  onActiveLoadCaseChange: (loadCaseId: string) => void;
  onSelectedEigenModeChange: (modeNo: number) => void;
  onSelectedResponseSpectrumResultChange: (
    value: ThreeViewportProps["selectedResponseSpectrumResult"],
  ) => void;
  onSpacerAxisSwapChange: (value: NonNullable<ThreeViewportProps["spacerAxisSwap"]>) => void;
  onAnimationOptionsChange: (options: AnimationOptions) => void;
  onInitializationError: (slotId: string, error: unknown) => void;
};

const DEFAULT_CAMERA_SYNC = true;

/**
 * Side-by-side viewer that drives both ThreeViewport instances from a
 * single shared animation clock and keeps the cameras in sync when
 * `cameraSync` is on. The layout is flex-row and the two panes share
 * `flex: 1 1 50%` so each gets half the available width.
 */
export function CompareShell({
  slots,
  leftResult,
  rightResult,
  selectedSection,
  selection,
  activeLoadCase,
  eigenModeNos,
  selectedEigenMode,
  selectedResponseSpectrumResult,
  spacerAxisSwap,
  animationOptions,
  cameraSync = DEFAULT_CAMERA_SYNC,
  onSelectionChange,
  onActiveLoadCaseChange,
  onSelectedEigenModeChange,
  onSelectedResponseSpectrumResultChange,
  onSpacerAxisSwapChange,
  onAnimationOptionsChange,
  onInitializationError,
}: CompareShellProps) {
  const [visibility] = useState<ViewerVisibility>(defaultVisibility);
  const [scales] = useState<ViewerScales>(defaultScales);
  const [clockSeconds, setClockSeconds] = useState<number | null>(null);
  const lastClockRef = useRef<number>(0);
  const leftHandleRef = useRef<ThreeViewportHandle | null>(null);
  const rightHandleRef = useRef<ThreeViewportHandle | null>(null);
  const [syncingCamera, setSyncingCamera] = useState(false);

  // Drive the shared animation clock from a single requestAnimationFrame
  // loop. The clock only advances when at least one slot is animating;
  // otherwise the last value is reused.
  useEffect(() => {
    if (!slots.length) return undefined;
    if (!animationOptions.enabled) {
      setClockSeconds(null);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      lastClockRef.current = elapsed;
      setClockSeconds(elapsed);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [animationOptions.enabled, slots.length]);

  const loadCaseId =
    activeLoadCase || slots[0]?.project.loadCases[0]?.id || "";

  // Camera sync: every animation frame, snapshot the left viewport and
  // apply it to the right viewport (and vice versa) so they stay locked.
  useEffect(() => {
    if (!cameraSync) return undefined;
    if (slots.length < 2) return undefined;
    let frame = 0;
    const tick = () => {
      if (!syncingCamera) {
        const left = leftHandleRef.current?.getCameraState();
        const right = rightHandleRef.current?.getCameraState();
        if (left && right) {
          // Drift detection: if either position moved more than a small
          // epsilon since the last sync, copy from the one that changed.
          const leftPos = left.position;
          const rightPos = right.position;
          const distance = Math.hypot(
            leftPos.x - rightPos.x,
            leftPos.y - rightPos.y,
            leftPos.z - rightPos.z,
          );
          if (distance > 1e-3) {
            // Use the one whose target is closer to the model origin as
            // the source so the "leader" is stable per session.
            const leftOrigin = Math.hypot(left.target.x, left.target.y, left.target.z);
            const rightOrigin = Math.hypot(right.target.x, right.target.y, right.target.z);
            const source = leftOrigin <= rightOrigin ? left : right;
            setSyncingCamera(true);
            if (source === left) {
              rightHandleRef.current?.applyCameraState(source);
            } else {
              leftHandleRef.current?.applyCameraState(source);
            }
            window.requestAnimationFrame(() => setSyncingCamera(false));
          }
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [cameraSync, slots.length, syncingCamera]);

  const renderSlot = (
    slot: CompareSlotDescriptor,
    handleRef: React.MutableRefObject<ThreeViewportHandle | null>,
    slotResult: AnalysisResult | null,
  ) => {
    const loadCases = slot.project.loadCases.map((c) => c.id).filter(Boolean);
    const effectiveLoadCase = loadCases.includes(loadCaseId) ? loadCaseId : loadCases[0] ?? "";
    return (
      <section
        key={slot.id}
        className="compare-slot"
        data-testid={`compare-slot-${slot.id}`}
      >
        <header className="compare-slot-header">
          <h3>{slot.label}</h3>
          <p>{slot.caption}</p>
        </header>
        <div className="compare-slot-body">
          <ThreeViewport
            ref={handleRef}
            project={slot.project}
            result={slotResult}
            selectedSection={selectedSection}
            selection={selection}
            activeLoadCase={effectiveLoadCase}
            visibility={visibility}
            scales={scales}
            selectedLoadCaseId={effectiveLoadCase}
            eigenModeNos={eigenModeNos}
            selectedEigenMode={selectedEigenMode}
            selectedResponseSpectrumResult={selectedResponseSpectrumResult}
            spacerAxisSwap={spacerAxisSwap}
            animationOptions={animationOptions}
            externalAnimationClockSeconds={clockSeconds}
            fitRequest={1}
            cameraRequest={null}
            onSelectionChange={(next) => onSelectionChange(slot.id, next)}
            onActiveLoadCaseChange={onActiveLoadCaseChange}
            onSelectedEigenModeChange={onSelectedEigenModeChange}
            onSelectedResponseSpectrumResultChange={onSelectedResponseSpectrumResultChange}
            onSpacerAxisSwapChange={onSpacerAxisSwapChange}
            onAnimationOptionsChange={onAnimationOptionsChange}
            onInitializationError={(err) => onInitializationError(slot.id, err)}
          />
        </div>
        <CompareSlotSummary project={slot.project} result={slotResult} />
      </section>
    );
  };

  const leftSlot = slots[0];
  const rightSlot = slots[1];

  return (
    <div
      className="compare-shell"
      data-testid="compare-shell"
      data-camera-sync={cameraSync ? "on" : "off"}
    >
      {leftSlot ? renderSlot(leftSlot, leftHandleRef, leftResult) : null}
      {rightSlot ? renderSlot(rightSlot, rightHandleRef, rightResult) : null}
      {leftSlot && rightSlot ? (
        <ComparisonPanel
          leftProject={leftSlot.project}
          rightProject={rightSlot.project}
          leftResult={leftResult}
          rightResult={rightResult}
          selectedModeNo={selectedEigenMode}
          leftLabel={leftSlot.label}
          rightLabel={rightSlot.label}
        />
      ) : null}
    </div>
  );
}

/**
 * Summary card shown beneath each slot. Includes bridge meta, ground
 * conditions, and the first three eigen periods when an analysis result
 * is available.
 */
function CompareSlotSummary({
  project,
  result,
}: {
  project: ProjectModel;
  result: AnalysisResult | null;
}) {
  const info = useMemo<BridgeVariantInfo>(
    () => describeBridgeVariant(project),
    [project],
  );
  const periods = useMemo(() => {
    if (!result || result.errors.length > 0) return [];
    return (result.eigenResult?.modes ?? [])
      .slice()
      .sort((a, b) => a.modeNo - b.modeNo)
      .slice(0, 3)
      .map((mode) => ({ modeNo: mode.modeNo, period: mode.period }));
  }, [result]);
  const maxDisplacement = useMemo(() => {
    if (!result || result.errors.length > 0) return null;
    let maxH = 0;
    let maxV = 0;
    for (const item of result.displacements) {
      const h = Math.hypot(item.ux, item.uz);
      const v = Math.abs(item.uy);
      if (h > maxH) maxH = h;
      if (v > maxV) maxV = v;
    }
    return { horizontal: maxH, vertical: maxV };
  }, [result]);
  return (
    <div className="compare-slot-summary" data-testid={`compare-summary-${info.variant}`}>
      <dl>
        <dt>Model</dt>
        <dd>{info.variant === "suspended" ? "Suspended Deck" : "Continuous Deck"}</dd>
        <dt>Bridge Length</dt>
        <dd>{info.totalLength.toFixed(0)} m</dd>
        <dt>Spans</dt>
        <dd>{info.spanCount}</dd>
        <dt>Piers</dt>
        <dd>
          {info.pierCount} (rock {info.rockPierCount} / soft {info.softPierCount})
        </dd>
        <dt>Suspended Junctions</dt>
        <dd>{info.suspendedJunctionCount}</dd>
        <dt>Period 1</dt>
        <dd>{formatPeriod(periods[0]?.period)}</dd>
        <dt>Period 2</dt>
        <dd>{formatPeriod(periods[1]?.period)}</dd>
        <dt>Period 3</dt>
        <dd>{formatPeriod(periods[2]?.period)}</dd>
        <dt>Max Horizontal Disp.</dt>
        <dd>{maxDisplacement ? `${maxDisplacement.horizontal.toFixed(4)} m` : "-"}</dd>
        <dt>Max Vertical Disp.</dt>
        <dd>{maxDisplacement ? `${maxDisplacement.vertical.toFixed(4)} m` : "-"}</dd>
      </dl>
    </div>
  );
}

function formatPeriod(period: number | undefined): string {
  if (period === undefined || !Number.isFinite(period)) return "-";
  if (period < 0.001) return "< 0.001 s";
  return `${period.toFixed(3)} s`;
}

export function defaultCompareAnimationOptions(): AnimationOptions {
  return { ...DEFAULT_ANIMATION_OPTIONS, enabled: true, scale: 1.5 };
}

export type { CameraStateSnapshot };