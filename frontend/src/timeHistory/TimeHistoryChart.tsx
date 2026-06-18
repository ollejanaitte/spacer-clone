import { useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import locale from "../i18n/locales/ja.json";
import type { TimeHistoryResult } from "../types";
import { chooseEngineeringScale, formatEngineeringValue, formatExponentialTick } from "./chartScale";

type Quantity = "displacement" | "velocity" | "acceleration";
type ResultKey = "displacements" | "velocities" | "accelerations";

const resultKey: Record<Quantity, ResultKey> = {
  displacement: "displacements",
  velocity: "velocities",
  acceleration: "accelerations",
};

const colors = ["#60a5fa", "#22c55e", "#f97316", "#e879f9", "#facc15", "#2dd4bf"];

type TimeHistoryChartProps = {
  result: TimeHistoryResult;
  selectedKeys: string[];
};

export function TimeHistoryChart({ result, selectedKeys }: TimeHistoryChartProps) {
  const text = locale.thAnalysis.results.chart;
  const hostRef = useRef<HTMLDivElement>(null);
  const [quantities, setQuantities] = useState<Quantity[]>(["displacement"]);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const keys = selectedKeys.length > 0 ? selectedKeys : availableKeys(result).slice(0, 1);
  const series = useMemo(
    () =>
      quantities.flatMap((quantity) =>
        keys
          .filter((key) => Array.isArray(result[resultKey[quantity]]?.[key]))
          .map((key) => ({
            id: `${quantity}:${key}`,
            quantity,
            key,
            label: `${key} / ${quantityLabel(quantity)}`,
            values: result[resultKey[quantity]]?.[key] ?? [],
          })),
      ),
    [keys, quantities, result],
  );
  const data = useMemo(
    () =>
      result.time.map((time, index) => {
        const row: Record<string, number> = { time };
        for (const item of series) {
          const value = item.values[index];
          if (typeof value === "number" && Number.isFinite(value)) row[item.id] = value;
        }
        return row;
      }),
    [result.time, series],
  );
  const scales = useMemo(
    () =>
      Object.fromEntries(
        quantities.map((quantity) => {
          const values = series
            .filter((item) => item.quantity === quantity)
            .flatMap((item) => item.values)
            .filter(Number.isFinite);
          return [quantity, chooseEngineeringScale(Math.max(0, ...values.map(Math.abs)))];
        }),
      ) as Record<Quantity, ReturnType<typeof chooseEngineeringScale>>,
    [quantities, series],
  );

  const toggleQuantity = (quantity: Quantity) => {
    setQuantities((current) =>
      current.includes(quantity)
        ? current.filter((item) => item !== quantity)
        : [...current, quantity],
    );
  };

  const exportCsv = () => {
    const header = ["time", ...series.map((item) => item.label)];
    const rows = result.time.map((time, index) => [
      time,
      ...series.map((item) => item.values[index] ?? ""),
    ]);
    downloadBlob(
      [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"),
      "time-history.csv",
      "text/csv;charset=utf-8",
    );
  };

  const savePng = async () => {
    const svg = hostRef.current?.querySelector("svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const image = new Image();
    const url = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1200, image.width);
      canvas.height = Math.max(600, image.height);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#172238";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob && downloadBlob(blob, "time-history.png", "image/png"));
      URL.revokeObjectURL(url);
    };
    image.src = url;
  };

  return (
    <div className="time-history-recharts" ref={hostRef}>
      <div className="time-history-chart-toolbar">
        <div>
          <strong>{text.heading}</strong>
          <small>{text.legendHelp}</small>
        </div>
        <div className="time-history-chart-quantities" aria-label={text.quantity}>
          {(["displacement", "velocity", "acceleration"] as Quantity[]).map((quantity) => (
            <label key={quantity}>
              <input
                type="checkbox"
                checked={quantities.includes(quantity)}
                onChange={() => toggleQuantity(quantity)}
              />
              {quantityLabel(quantity)}
            </label>
          ))}
        </div>
        <button type="button" onClick={savePng}>{text.savePng}</button>
        <button type="button" onClick={exportCsv}>{text.exportCsv}</button>
      </div>
      {series.length === 0 ? (
        <div className="time-history-empty-result-guide">{text.empty}</div>
      ) : (
        <div className="time-history-chart-host" data-testid="time-history-chart">
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={data} margin={{ top: 18, right: 48, bottom: 18, left: 28 }}>
              <CartesianGrid stroke="rgba(148,163,184,.2)" verticalPoints={[160, 320, 480, 640, 800]} />
              <XAxis
                dataKey="time"
                type="number"
                domain={[0, result.meta.duration ?? "dataMax"]}
                tickCount={6}
                label={{ value: text.time, position: "insideBottom", offset: -10, fill: "#94a3b8" }}
                stroke="#94a3b8"
              />
              {quantities.map((quantity, index) => (
                <YAxis
                  key={quantity}
                  yAxisId={quantity}
                  orientation={index === 1 ? "right" : "left"}
                  hide={index > 1}
                  domain={["auto", "auto"]}
                  tickFormatter={formatExponentialTick}
                  stroke={colors[index]}
                  width={82}
                />
              ))}
              <Tooltip
                formatter={(value, name) => {
                  const item = series.find((candidate) => candidate.label === name);
                  const quantity = item?.quantity ?? "displacement";
                  return [formatEngineeringValue(Number(value), scales[quantity]), String(name)];
                }}
                labelFormatter={(value) => `${text.time}: ${Number(value).toFixed(3)}`}
                contentStyle={{ background: "#111c2f", border: "1px solid rgba(255,255,255,.12)", color: "#e5edf8" }}
              />
              <Legend
                onClick={(entry) => {
                  const id = series.find((item) => item.label === entry.value)?.id;
                  if (!id) return;
                  setHiddenSeries((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
              />
              {series.map((item, index) => (
                <Line
                  key={item.id}
                  type="linear"
                  dataKey={item.id}
                  name={item.label}
                  yAxisId={item.quantity}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  hide={hiddenSeries.has(item.id)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function availableKeys(result: TimeHistoryResult): string[] {
  return Array.from(new Set([
    ...Object.keys(result.displacements ?? {}),
    ...Object.keys(result.velocities ?? {}),
    ...Object.keys(result.accelerations ?? {}),
  ])).sort();
}

function quantityLabel(quantity: Quantity): string {
  const text = locale.thAnalysis.results.chart;
  if (quantity === "displacement") return text.displacement;
  if (quantity === "velocity") return text.velocity;
  return text.acceleration;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function downloadBlob(content: Blob | string, fileName: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
