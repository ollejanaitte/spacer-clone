import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ja } from "../../i18n/ja";
import { formatStationDisplay } from "../core/station/stationFormat";
import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
  VerticalGradeElementDraft,
  VerticalParabolicElementDraft,
} from "../schema/types";

export type VerticalProfileChartProps = {
  verticalAlignment: VerticalAlignmentDraft;
};

type ProfilePoint = {
  station: number;
  elevation: number;
};

type ProfileSeries = {
  id: string;
  label: string;
  color: string;
  points: ProfilePoint[];
};

const PARABOLIC_SAMPLE_DIVISIONS = 16;
const SERIES_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#ca8a04"];
const CHART_LABEL_COLOR = "#526173";
const CHART_GRID_COLOR = "rgba(148, 163, 184, 0.35)";

function displayStartElevation(value: number | undefined): number {
  return value ?? 0;
}

export function buildGradeProfilePoints(element: VerticalGradeElementDraft): ProfilePoint[] {
  const startElevation = element.startElevation;
  const endElevation =
    startElevation + element.grade * (element.endStation - element.startStation);

  return [
    { station: element.startStation, elevation: startElevation },
    { station: element.endStation, elevation: endElevation },
  ];
}

export function buildParabolicProfilePoints(
  element: VerticalParabolicElementDraft,
): ProfilePoint[] {
  const startElevation = displayStartElevation(element.startElevation);
  const length = element.length;
  const rate = length === 0 ? 0 : (element.endGrade - element.startGrade) / length;
  const points: ProfilePoint[] = [];

  for (let index = 0; index <= PARABOLIC_SAMPLE_DIVISIONS; index += 1) {
    const u = (index / PARABOLIC_SAMPLE_DIVISIONS) * length;
    const station = element.startStation + u;
    const elevation = startElevation + element.startGrade * u + 0.5 * rate * u * u;
    points.push({ station, elevation });
  }

  return points;
}

function buildProfileSeries(element: VerticalElementDraft, index: number): ProfileSeries {
  const color = SERIES_COLORS[index % SERIES_COLORS.length];
  if (element.type === "grade") {
    return {
      id: element.id,
      label: `${ja.liner.fields.elementTypes.grade} ${element.id}`,
      color,
      points: buildGradeProfilePoints(element),
    };
  }

  return {
    id: element.id,
    label: `${ja.liner.fields.elementTypes.parabolic} ${element.id}`,
    color,
    points: buildParabolicProfilePoints(element),
  };
}

function collectAxisDomain(series: ProfileSeries[]): {
  stationDomain: [number, number];
  elevationDomain: [number, number];
} {
  const stations = series.flatMap((item) => item.points.map((point) => point.station));
  const elevations = series.flatMap((item) => item.points.map((point) => point.elevation));

  if (stations.length === 0 || elevations.length === 0) {
    return {
      stationDomain: [0, 1],
      elevationDomain: [0, 1],
    };
  }

  const minStation = Math.min(...stations);
  const maxStation = Math.max(...stations);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const stationPadding = Math.max((maxStation - minStation) * 0.05, 1);
  const elevationSpan = maxElevation - minElevation;
  const elevationPadding = Math.max(elevationSpan * 0.1, 0.5);

  return {
    stationDomain: [minStation - stationPadding, maxStation + stationPadding],
    elevationDomain: [
      minElevation - elevationPadding,
      maxElevation + elevationPadding,
    ],
  };
}

function formatElevationAxisValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

export function VerticalProfileChart({ verticalAlignment }: VerticalProfileChartProps) {
  const series = useMemo(
    () => verticalAlignment.elements.map((element, index) => buildProfileSeries(element, index)),
    [verticalAlignment.elements],
  );
  const axisDomain = useMemo(() => collectAxisDomain(series), [series]);
  const isEmpty = verticalAlignment.elements.length === 0;

  return (
    <section
      className="liner-edit-panel liner-vertical-profile-chart"
      aria-labelledby="liner-vertical-profile-chart-title"
      data-testid="vertical-profile-chart"
    >
      <h2 id="liner-vertical-profile-chart-title">{ja.liner.editor.verticalProfileSection}</h2>
      {isEmpty ? (
        <p className="liner-edit-help" data-testid="vertical-profile-chart-empty">
          {ja.liner.editor.verticalProfileEmpty}
        </p>
      ) : (
        <>
          <ul
            className="liner-vertical-profile-chart-legend"
            aria-label={ja.liner.editor.verticalProfileLegendLabel}
          >
            {series.map((item) => (
              <li key={item.id}>
                <span
                  className="liner-vertical-profile-chart-legend-swatch"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                {item.label}
              </li>
            ))}
          </ul>
          <div
            className="liner-vertical-profile-chart-host"
            data-testid="vertical-profile-chart-canvas"
            aria-label={ja.liner.editor.verticalProfileChartAriaLabel}
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart margin={{ top: 16, right: 24, bottom: 16, left: 8 }}>
                <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="4 4" />
                <XAxis
                  dataKey="station"
                  type="number"
                  domain={axisDomain.stationDomain}
                  tickFormatter={(value) => formatStationDisplay(Number(value))}
                  tick={{ fill: CHART_LABEL_COLOR, fontSize: 12 }}
                  stroke={CHART_LABEL_COLOR}
                  label={{
                    value: ja.liner.editor.verticalProfileStationAxis,
                    position: "insideBottom",
                    offset: -8,
                    fill: CHART_LABEL_COLOR,
                    fontSize: 12,
                  }}
                />
                <YAxis
                  domain={axisDomain.elevationDomain}
                  tickFormatter={formatElevationAxisValue}
                  tick={{ fill: CHART_LABEL_COLOR, fontSize: 12 }}
                  stroke={CHART_LABEL_COLOR}
                  width={72}
                  label={{
                    value: ja.liner.editor.verticalProfileElevationAxis,
                    angle: -90,
                    position: "insideLeft",
                    fill: CHART_LABEL_COLOR,
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  formatter={(value) => [
                    formatElevationAxisValue(Number(value)),
                    ja.liner.editor.verticalProfileElevationAxis,
                  ]}
                  labelFormatter={(value) =>
                    `${ja.liner.editor.verticalProfileStationAxis}: ${formatStationDisplay(Number(value))}`
                  }
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #cbd5df",
                    color: "#243447",
                    fontSize: "12px",
                  }}
                />
                {series.map((item) => (
                  <Line
                    key={item.id}
                    data={item.points}
                    type="linear"
                    dataKey="elevation"
                    name={item.label}
                    stroke={item.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
