import type { ViewerRuntimeDiagnostics } from "./types";
import {
  describeCameraPreset,
  describeFallbackReason,
  describeSolidVisibilityAssessment,
  describeViewerMode,
  UNAVAILABLE_LABEL,
} from "./runtimeDiagnostics";

type ViewerDiagnosticsProps = {
  diagnostics: ViewerRuntimeDiagnostics;
  open: boolean;
  onToggle: () => void;
};

export function ViewerDiagnostics({ diagnostics, open, onToggle }: ViewerDiagnosticsProps) {
  const apolloCounts = diagnostics.apolloCounts;
  const camera = diagnostics.camera;

  return (
    <section className="viewer-diagnostics">
      <button type="button" data-testid="viewer-diagnostics-toggle" onClick={onToggle}>
        診断
      </button>
      {open ? (
        <div className="viewer-diagnostics-body" data-testid="viewer-diagnostics-panel">
        <dl>
          <Row label="Viewer mode" value={describeViewerMode(diagnostics.viewerMode)} />
          <Row label="Fallback reason" value={describeFallbackReason(diagnostics.fallbackReason)} />
          <Row label="WebGL available" value={diagnostics.webgl.available ? "true" : "false"} />
          <Row label="WebGL renderer" value={diagnostics.webgl.renderer} />
          <Row label="WebGL vendor" value={diagnostics.webgl.vendor} />
          <Row label="WebGL version" value={diagnostics.webgl.version} />
          <Row label="WebGL shading language" value={diagnostics.webgl.shadingLanguageVersion} />
          <Row label="WebGL unmasked renderer" value={diagnostics.webgl.unmaskedRenderer} />
          <Row label="WebGL unmasked vendor" value={diagnostics.webgl.unmaskedVendor} />
          <Row label="GPU mode" value={diagnostics.gpuMode} />
          <Row label="App version" value={diagnostics.appVersion} />
          <Row label="Current preset" value={describeCameraPreset(diagnostics.currentViewPreset)} />
          <Row label="Line element count" value={apolloCounts?.lineElementCount ?? UNAVAILABLE_LABEL} />
          <Row label="Solid count" value={apolloCounts?.solidCount ?? UNAVAILABLE_LABEL} />
          <Row label="Girder count" value={apolloCounts?.girderCount ?? UNAVAILABLE_LABEL} />
          <Row label="Cross beam count" value={apolloCounts?.crossBeamCount ?? UNAVAILABLE_LABEL} />
          <Row label="Bracing count" value={apolloCounts?.bracingCount ?? UNAVAILABLE_LABEL} />
          <Row label="Deck count" value={apolloCounts?.deckCount ?? UNAVAILABLE_LABEL} />
          <Row label="Bearing count" value={apolloCounts?.bearingCount ?? UNAVAILABLE_LABEL} />
          <Row label="Marker count" value={apolloCounts?.markerCount ?? UNAVAILABLE_LABEL} />
          <Row label="Warning count" value={apolloCounts?.warningCount ?? UNAVAILABLE_LABEL} />
          <Row
            label="Solid display assessment"
            value={describeSolidVisibilityAssessment(
              apolloCounts,
              diagnostics.visibility,
              diagnostics.viewerMode,
              diagnostics.fallbackReason,
            )}
          />
          <Row label="Camera position" value={formatVector(camera?.position)} />
          <Row label="Camera target" value={formatVector(camera?.target)} />
          <Row label="Camera up" value={formatVector(camera?.up)} />
          <Row label="Visibility" value={formatVisibility(diagnostics.visibility)} />
        </dl>
        </div>
      ) : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{String(value)}</dd>
    </>
  );
}

function formatVector(
  value:
    | {
        x: number;
        y: number;
        z: number;
      }
    | null
    | undefined,
): string {
  if (!value) return UNAVAILABLE_LABEL;
  return `${value.x.toFixed(3)}, ${value.y.toFixed(3)}, ${value.z.toFixed(3)}`;
}

function formatVisibility(visibility: ViewerRuntimeDiagnostics["visibility"]): string {
  return [
    `line=${visibility.apolloLineModel !== false}`,
    `solid=${visibility.apolloSolidModel !== false}`,
    `girders=${visibility.apolloGirders !== false}`,
    `crossBeams=${visibility.apolloCrossBeams !== false}`,
    `bracings=${visibility.apolloBracings !== false}`,
    `deck=${visibility.apolloDeck !== false}`,
    `bearings=${visibility.apolloBearings !== false}`,
    `markers=${visibility.apolloMarkers === true}`,
  ].join(", ");
}
