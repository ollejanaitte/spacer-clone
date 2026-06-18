import { useMemo, useState } from "react";
import locale from "../../../i18n/locales/ja.json";
import type { ProjectModel, StructuredMessage, TimeHistoryResult } from "../../../types";
import { TimeHistoryResultViewer } from "../../TimeHistoryResultViewer";
import { ResultSummaryCard } from "../ResultSummaryCard";

type SectionResultsProps = {
  project: ProjectModel;
  result?: TimeHistoryResult | null;
  error?: StructuredMessage | null;
  onAnimationOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
};

type ResultPageId = "overview" | "max" | "chart" | "ground" | "animation" | "table" | "errors";

const resultPages: Array<{ id: ResultPageId; label: string; help: string }> = [
  { id: "overview", label: "概要", help: "解析が成功したか、点数・時間刻み・解析時間を確認します。" },
  { id: "max", label: "最大値一覧", help: "変位・速度・加速度の最大値を確認します。" },
  { id: "chart", label: "時刻歴グラフ", help: "時間ごとの応答値をグラフで確認します。" },
  { id: "ground", label: "地震波グラフ", help: "入力した地震波の形を確認します。" },
  { id: "animation", label: "アニメーション", help: "揺れ方を再生して確認します。" },
  { id: "table", label: "詳細表", help: "数値を表形式で確認します。" },
  { id: "errors", label: "エラー／警告", help: "問題がある場合の理由と対応を確認します。" },
];

export function SectionResults({ project, result = null, error = null, onAnimationOverrideChange }: SectionResultsProps) {
  const [activePage, setActivePage] = useState<ResultPageId>("overview");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const pageIndex = resultPages.findIndex((page) => page.id === activePage);
  const page = resultPages[pageIndex] ?? resultPages[0];
  const responseKeys = useMemo(() => responseHistoryKeys(result), [result]);
  const activeTargets = selectedTargets.filter((key) => responseKeys.includes(key));
  const selectedKey = activeTargets[0] ?? responseKeys[0] ?? "";
  const selectedSeries = selectedKey ? result?.displacements?.[selectedKey] ?? [] : [];
  const selectedGroundMotion = project.groundMotions?.find((motion) => motion.id === project.analysisSettings.timeHistory?.groundMotionId) ?? project.groundMotions?.[0] ?? null;

  const goPrevious = () => setActivePage(resultPages[Math.max(pageIndex - 1, 0)]?.id ?? "overview");
  const goNext = () => setActivePage(resultPages[Math.min(pageIndex + 1, resultPages.length - 1)]?.id ?? "overview");

  return (
    <section className="time-history-wizard-section time-history-results-section">
      <div className="time-history-results-hero">
        <div>
          <h3>結果表示</h3>
          <p>結果は紙芝居形式で1ページずつ確認できます。概要、最大値、グラフ、アニメーション、詳細表の順に見てください。</p>
        </div>
        <div className="time-history-results-tools">
          <label className="time-history-target-filter" title={locale.thAnalysis.results.displayTargetsHelp}>
            <span>{locale.thAnalysis.results.displayTargets}</span>
            <select
              multiple
              aria-label={locale.thAnalysis.results.displayTargets}
              value={activeTargets}
              onChange={(event) => {
                const values = Array.from(event.currentTarget.selectedOptions, (option) => option.value);
                setSelectedTargets(values);
              }}
            >
              {responseKeys.map((key) => <option key={key} value={key}>{key}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setSelectedTargets([])}>
            {locale.thAnalysis.results.allTargets}
          </button>
          <div className="time-history-page-counter">{pageIndex + 1} / {resultPages.length}</div>
        </div>
      </div>
      <div className="time-history-result-page-tabs" aria-label="結果ページ選択">
        {resultPages.map((item, index) => (
          <button key={item.id} type="button" className={item.id === activePage ? "active" : ""} onClick={() => setActivePage(item.id)}>
            <span>{index + 1}</span>{item.label}
          </button>
        ))}
      </div>
      <article className="time-history-result-page-card">
        <header>
          <div><span className="time-history-page-kicker">結果ページ {pageIndex + 1}</span><h4>{page.label}</h4><p>{page.help}</p></div>
          <div className="time-history-page-nav"><button type="button" onClick={goPrevious} disabled={pageIndex <= 0}>前のページ</button><button type="button" onClick={goNext} disabled={pageIndex >= resultPages.length - 1}>次のページ</button></div>
        </header>
        {!result && activePage !== "errors" ? <EmptyRunGuide /> : (
          <>
            {activePage === "overview" && <OverviewPage result={result} project={project} />}
            {activePage === "max" && <MaxValuesPage result={result} />}
            {activePage === "chart" && <ChartPage result={result} selectedKey={selectedKey} values={selectedSeries} />}
            {activePage === "ground" && <GroundMotionPage motion={selectedGroundMotion} />}
            {activePage === "animation" && <TimeHistoryResultViewer project={project} result={result} error={error} status={result?.meta?.status} onOverrideChange={onAnimationOverrideChange} />}
            {activePage === "table" && <TablePage result={result} selectedKey={selectedKey} values={selectedSeries} />}
            {activePage === "errors" && <ErrorsPage result={result} error={error} />}
          </>
        )}
      </article>
    </section>
  );
}

function EmptyRunGuide() {
  return <div className="time-history-empty-result-guide"><strong>まだ結果がありません。</strong><p>「解析実行」ページで時刻歴解析を実行してください。</p></div>;
}

function OverviewPage({ result, project }: { result: TimeHistoryResult | null; project: ProjectModel }) {
  return <div className="time-history-page-grid"><ResultSummaryCard result={result} /><div className="time-history-overview-card"><h5>解析情報</h5><dl><div><dt>状態</dt><dd>{result?.meta?.status ?? "未実行"}</dd></div><div><dt>解析ID</dt><dd>{result?.meta?.analysisId ?? "-"}</dd></div><div><dt>手法</dt><dd>{result?.meta?.method ?? project.analysisSettings.timeHistory?.method ?? "-"}</dd></div><div><dt>dt</dt><dd>{formatNumber(result?.meta?.timeStep ?? project.analysisSettings.timeHistory?.timeStep)} 秒</dd></div><div><dt>解析時間</dt><dd>{formatNumber(result?.meta?.duration ?? project.analysisSettings.timeHistory?.duration)} 秒</dd></div><div><dt>サンプル数</dt><dd>{result?.meta?.sampleCount ?? "-"}</dd></div></dl></div><div className="time-history-beginner-note"><strong>見方</strong><p>まず状態が success になっているか確認します。次に最大値一覧とグラフを確認します。</p></div></div>;
}

function MaxValuesPage({ result }: { result: TimeHistoryResult | null }) {
  const rows = [...maxRows("変位", result?.displacements, result?.time), ...maxRows("速度", result?.velocities, result?.time), ...maxRows("加速度", result?.accelerations, result?.time)].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 24);
  if (rows.length === 0) return <EmptyPage />;
  return <div className="time-history-table-wrap"><table><thead><tr><th>種類</th><th>キー</th><th>最大絶対値</th><th>時刻</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.kind}-${row.key}`}><td>{row.kind}</td><td>{row.key}</td><td>{formatNumber(row.value)}</td><td>{formatNumber(row.time)} 秒</td></tr>)}</tbody></table></div>;
}

function ChartPage({ result, selectedKey, values }: { result: TimeHistoryResult | null; selectedKey: string; values: number[] }) {
  return <div><p className="time-history-help-text">表示対象: {selectedKey || "-"} / 変位</p><SeriesSvg time={result?.time ?? []} values={values} label="時刻歴応答" /></div>;
}

function GroundMotionPage({ motion }: { motion: NonNullable<ProjectModel["groundMotions"]>[number] | null }) {
  return <div><div className="time-history-ground-motion-summary"><span>地震波: {motion?.name ?? motion?.id ?? "-"}</span><span>単位: {motion?.unit ?? "-"}</span><span>dt: {formatNumber(motion?.timeStep)} 秒</span><span>点数: {motion?.samples.length ?? 0}</span></div><SeriesSvg time={(motion?.samples ?? []).map((_, index) => index * (motion?.timeStep ?? 0))} values={motion?.samples ?? []} label="入力地震波" /></div>;
}

function TablePage({ result, selectedKey, values }: { result: TimeHistoryResult | null; selectedKey: string; values: number[] }) {
  const rows = (result?.time ?? []).map((time, index) => ({ time, value: values[index] })).slice(0, 200);
  if (rows.length === 0) return <EmptyPage />;
  return <div className="time-history-table-wrap"><p className="time-history-help-text">表示対象: {selectedKey || "-"} / 先頭200行まで表示</p><table><thead><tr><th>No.</th><th>時刻 秒</th><th>値</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.time}-${index}`}><td>{index + 1}</td><td>{formatNumber(row.time)}</td><td>{formatNumber(row.value)}</td></tr>)}</tbody></table></div>;
}

function ErrorsPage({ result, error }: { result: TimeHistoryResult | null; error?: StructuredMessage | null }) {
  if (!error && result?.meta?.status !== "failed") return <div className="time-history-run-ready">現在表示するエラーはありません。</div>;
  return <div className="time-history-error-card"><strong>エラー／警告</strong><p>{error?.message ?? "解析結果が失敗状態です。入力条件を確認してください。"}</p>{error && <dl><div><dt>コード</dt><dd>{error.code}</dd></div><div><dt>パス</dt><dd>{error.path ?? "-"}</dd></div></dl>}</div>;
}

function SeriesSvg({ time, values, label }: { time: number[]; values: number[]; label: string }) {
  const points = buildSvgPoints(time, values);
  if (points.length === 0) return <EmptyPage />;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  return <div className="time-history-svg-chart-card"><div className="time-history-chart-caption"><strong>{label}</strong><span>最大: {formatNumber(Math.max(...values.map((value) => Math.abs(value))))}</span></div><svg viewBox="0 0 720 260" role="img" aria-label={label}><line x1="40" y1="130" x2="700" y2="130" /><line x1="40" y1="20" x2="40" y2="240" /><path d={path} /><text x="40" y="255">0 秒</text><text x="620" y="255">{formatNumber(time[time.length - 1])} 秒</text></svg></div>;
}

function buildSvgPoints(time: number[], values: number[]): Array<{ x: number; y: number }> {
  if (time.length === 0 || values.length === 0) return [];
  const stride = Math.max(1, Math.ceil(values.length / 360));
  const finiteAbs = values.map((value) => Math.abs(value)).filter(Number.isFinite);
  const maxAbs = Math.max(...finiteAbs, 1);
  const maxTime = time[Math.min(time.length - 1, values.length - 1)] || 1;
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < values.length; index += stride) {
    const value = values[index];
    const t = time[index] ?? index;
    if (!Number.isFinite(value)) continue;
    points.push({ x: 40 + (t / maxTime) * 660, y: 130 - (value / maxAbs) * 105 });
  }
  return points;
}

function responseHistoryKeys(result: TimeHistoryResult | null): string[] {
  if (!result) return [];
  return Array.from(new Set([...Object.keys(result.displacements ?? {}), ...Object.keys(result.velocities ?? {}), ...Object.keys(result.accelerations ?? {})])).sort();
}

function maxRows(kind: string, record: Record<string, number[]> | undefined, time: number[] | undefined) {
  if (!record) return [];
  return Object.entries(record).map(([key, values]) => {
    let value = 0;
    let index = 0;
    values.forEach((candidate, candidateIndex) => {
      if (Number.isFinite(candidate) && Math.abs(candidate) >= Math.abs(value)) {
        value = candidate;
        index = candidateIndex;
      }
    });
    return { kind, key, value, time: time?.[index] ?? index };
  });
}

function EmptyPage() {
  return <div className="time-history-empty-result-guide">表示できるデータがありません。</div>;
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001) ? value.toExponential(4) : value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
