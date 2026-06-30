import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import { computeOffsetLineElevation } from "../core/crossSectionElevation";
import type {
  CrossSectionOffsetLineDraft,
  CrossSectionOffsetLineRole,
  CrossSectionTemplateDraft,
} from "../schema/types";

export type CrossSectionPreviewProps = {
  template: CrossSectionTemplateDraft;
};

const OFFSET_LINE_ROLES: readonly CrossSectionOffsetLineRole[] = [
  "shoulder",
  "lane",
  "median",
  "sidewalk",
  "edge",
  "custom",
];

const ROLE_COLORS: Record<CrossSectionOffsetLineRole, string> = {
  shoulder: "#64748b",
  lane: "#2563eb",
  median: "#9333ea",
  sidewalk: "#16a34a",
  edge: "#ea580c",
  custom: "#0891b2",
};

const UNSPECIFIED_ROLE_COLOR = "#94a3b8";

const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 320;
const PLOT_PADDING = 48;

type PlotDomain = {
  minOffset: number;
  maxOffset: number;
  minElevation: number;
  maxElevation: number;
};

type PlotPoint = {
  line: CrossSectionOffsetLineDraft;
  sx: number;
  sy: number;
};

function resolveRoleColor(role: CrossSectionOffsetLineRole | undefined): string {
  if (role === undefined) {
    return UNSPECIFIED_ROLE_COLOR;
  }
  return ROLE_COLORS[role];
}

function roleLegendLabel(role: CrossSectionOffsetLineRole | undefined): string {
  if (role === undefined) {
    return ja.liner.fields.offsetLineRoles.unspecified;
  }
  return ja.liner.fields.offsetLineRoles[role];
}

function resolveDisplayElevation(
  line: CrossSectionOffsetLineDraft,
  slopePercent: number,
): number {
  return computeOffsetLineElevation(line.offset, slopePercent);
}

function collectPlotDomain(
  offsetLines: readonly CrossSectionOffsetLineDraft[],
  slopePercent: number,
): PlotDomain {
  if (offsetLines.length === 0) {
    return {
      minOffset: -1,
      maxOffset: 1,
      minElevation: -1,
      maxElevation: 1,
    };
  }

  const offsets = offsetLines.map((line) => line.offset);
  const elevations = offsetLines.map((line) => resolveDisplayElevation(line, slopePercent));

  const minOffset = Math.min(...offsets);
  const maxOffset = Math.max(...offsets);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);

  const offsetSpan = maxOffset - minOffset;
  const elevationSpan = maxElevation - minElevation;
  const offsetPadding = Math.max(offsetSpan * 0.1, 0.5);
  const elevationPadding = Math.max(elevationSpan * 0.1, 0.5);

  return {
    minOffset: minOffset - offsetPadding,
    maxOffset: maxOffset + offsetPadding,
    minElevation: minElevation - elevationPadding,
    maxElevation: maxElevation + elevationPadding,
  };
}

function toSvgX(offset: number, domain: PlotDomain, plotWidth: number): number {
  const span = domain.maxOffset - domain.minOffset;
  if (span === 0) {
    return PLOT_PADDING + plotWidth / 2;
  }
  return PLOT_PADDING + ((offset - domain.minOffset) / span) * plotWidth;
}

function toSvgY(elevation: number, domain: PlotDomain, plotHeight: number): number {
  const span = domain.maxElevation - domain.minElevation;
  if (span === 0) {
    return PLOT_PADDING + plotHeight / 2;
  }
  return PLOT_PADDING + plotHeight - ((elevation - domain.minElevation) / span) * plotHeight;
}

function formatAxisValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

function collectLegendRoles(
  offsetLines: readonly CrossSectionOffsetLineDraft[],
): Array<CrossSectionOffsetLineRole | undefined> {
  const roles = new Set<CrossSectionOffsetLineRole | undefined>();
  for (const line of offsetLines) {
    roles.add(line.role);
  }

  const orderedRoles: Array<CrossSectionOffsetLineRole | undefined> = OFFSET_LINE_ROLES.filter((role) =>
    roles.has(role),
  );
  if (roles.has(undefined)) {
    orderedRoles.push(undefined);
  }
  return orderedRoles;
}

function buildTickValues(min: number, max: number, count: number): number[] {
  if (count <= 1 || max <= min) {
    return [min];
  }

  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

export function CrossSectionPreview({ template }: CrossSectionPreviewProps) {
  const offsetLines = template.offsetLines;
  const slopePercent = template.crossSlope?.valuePercent ?? 0;
  const isEmpty = offsetLines.length === 0;

  const plotWidth = VIEW_WIDTH - PLOT_PADDING * 2;
  const plotHeight = VIEW_HEIGHT - PLOT_PADDING * 2;

  const domain = useMemo(
    () => collectPlotDomain(offsetLines, slopePercent),
    [offsetLines, slopePercent],
  );
  const legendRoles = useMemo(() => collectLegendRoles(offsetLines), [offsetLines]);

  const plotPoints = useMemo(
    (): PlotPoint[] =>
      offsetLines.map((line) => {
        const elevation = resolveDisplayElevation(line, slopePercent);
        return {
          line: { ...line, elevation },
          sx: toSvgX(line.offset, domain, plotWidth),
          sy: toSvgY(elevation, domain, plotHeight),
        };
      }),
    [domain, offsetLines, plotHeight, plotWidth, slopePercent],
  );

  const profilePoints = useMemo(() => {
    const sorted = [...plotPoints].sort((left, right) => left.line.offset - right.line.offset);
    return sorted.map((point) => `${point.sx},${point.sy}`).join(" ");
  }, [plotPoints]);

  const offsetTicks = useMemo(
    () => buildTickValues(domain.minOffset, domain.maxOffset, 5),
    [domain.maxOffset, domain.minOffset],
  );
  const elevationTicks = useMemo(
    () => buildTickValues(domain.minElevation, domain.maxElevation, 5),
    [domain.maxElevation, domain.minElevation],
  );

  const zeroOffsetX = toSvgX(0, domain, plotWidth);
  const zeroElevationY = toSvgY(0, domain, plotHeight);
  const showZeroOffset =
    zeroOffsetX >= PLOT_PADDING && zeroOffsetX <= PLOT_PADDING + plotWidth;
  const showZeroElevation =
    zeroElevationY >= PLOT_PADDING && zeroElevationY <= PLOT_PADDING + plotHeight;

  return (
    <figure className="liner-cross-section-preview" data-testid="cross-section-preview">
      {isEmpty ? (
        <p className="liner-edit-help" data-testid="cross-section-preview-empty">
          {ja.liner.editor.crossSectionPreviewEmpty}
        </p>
      ) : (
        <>
          <ul
            className="liner-cross-section-preview-legend"
            aria-label={ja.liner.editor.crossSectionPreviewLegendLabel}
          >
            {legendRoles.map((role) => (
              <li key={role ?? "unspecified"}>
                <span
                  className="liner-cross-section-preview-legend-swatch"
                  style={{ backgroundColor: resolveRoleColor(role) }}
                  aria-hidden="true"
                />
                {roleLegendLabel(role)}
              </li>
            ))}
          </ul>
          <svg
            className="liner-cross-section-preview-svg"
            role="img"
            aria-label={ja.liner.editor.crossSectionPreviewChartAriaLabel}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            data-testid="cross-section-preview-canvas"
          >
            <g className="liner-cross-section-preview-grid">
              {offsetTicks.map((offset) => {
                const x = toSvgX(offset, domain, plotWidth);
                return (
                  <line
                    key={`offset-grid-${offset}`}
                    x1={x}
                    y1={PLOT_PADDING}
                    x2={x}
                    y2={PLOT_PADDING + plotHeight}
                  />
                );
              })}
              {elevationTicks.map((elevation) => {
                const y = toSvgY(elevation, domain, plotHeight);
                return (
                  <line
                    key={`elevation-grid-${elevation}`}
                    x1={PLOT_PADDING}
                    y1={y}
                    x2={PLOT_PADDING + plotWidth}
                    y2={y}
                  />
                );
              })}
            </g>

            {showZeroOffset && (
              <line
                className="liner-cross-section-preview-zero-line"
                x1={zeroOffsetX}
                y1={PLOT_PADDING}
                x2={zeroOffsetX}
                y2={PLOT_PADDING + plotHeight}
              />
            )}
            {showZeroElevation && (
              <line
                className="liner-cross-section-preview-zero-line"
                x1={PLOT_PADDING}
                y1={zeroElevationY}
                x2={PLOT_PADDING + plotWidth}
                y2={zeroElevationY}
              />
            )}

            <line
              className="liner-cross-section-preview-axis"
              x1={PLOT_PADDING}
              y1={PLOT_PADDING + plotHeight}
              x2={PLOT_PADDING + plotWidth}
              y2={PLOT_PADDING + plotHeight}
            />
            <line
              className="liner-cross-section-preview-axis"
              x1={PLOT_PADDING}
              y1={PLOT_PADDING}
              x2={PLOT_PADDING}
              y2={PLOT_PADDING + plotHeight}
            />

            {offsetTicks.map((offset) => {
              const x = toSvgX(offset, domain, plotWidth);
              return (
                <text
                  key={`offset-tick-${offset}`}
                  className="liner-cross-section-preview-tick"
                  x={x}
                  y={PLOT_PADDING + plotHeight + 16}
                  textAnchor="middle"
                >
                  {formatAxisValue(offset)}
                </text>
              );
            })}
            {elevationTicks.map((elevation) => {
              const y = toSvgY(elevation, domain, plotHeight);
              return (
                <text
                  key={`elevation-tick-${elevation}`}
                  className="liner-cross-section-preview-tick"
                  x={PLOT_PADDING - 8}
                  y={y + 4}
                  textAnchor="end"
                >
                  {formatAxisValue(elevation)}
                </text>
              );
            })}

            <text
              className="liner-cross-section-preview-axis-label"
              x={PLOT_PADDING + plotWidth / 2}
              y={VIEW_HEIGHT - 8}
              textAnchor="middle"
            >
              {ja.liner.fields.offsetRightPositive}
            </text>
            <text
              className="liner-cross-section-preview-axis-label"
              x={16}
              y={PLOT_PADDING + plotHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90 16 ${PLOT_PADDING + plotHeight / 2})`}
            >
              {ja.liner.fields.elevationUpPositive}
            </text>

            {profilePoints && (
              <polyline className="liner-cross-section-preview-profile" points={profilePoints} />
            )}

            <g className="liner-cross-section-preview-points">
              {plotPoints.map((point) => (
                <circle
                  key={point.line.id}
                  className="liner-cross-section-preview-point"
                  cx={point.sx}
                  cy={point.sy}
                  r={5}
                  fill={resolveRoleColor(point.line.role)}
                  data-testid={`cross-section-preview-point-${point.line.id}`}
                >
                  <title>
                    {point.line.label ?? point.line.id}: {formatAxisValue(point.line.offset)},{" "}
                    {formatAxisValue(point.line.elevation)}
                  </title>
                </circle>
              ))}
            </g>
          </svg>
        </>
      )}
    </figure>
  );
}
