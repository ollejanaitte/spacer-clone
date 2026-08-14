/**
 * Authoritative IF3 result tables (Phase 9-04R3 I-06/07/08).
 *
 * Displays the linear-static result from the IF3 FrameAnalysisResultResource:
 *  - Reaction (supportReaction rows; vertical = fz, up-positive)
 *  - N / Q / M / T (memberEndForce rows mapped from flat i/j end forces)
 *  - Deformed shape summary (nodeDisplacement rows + display scale)
 *
 * The view is only rendered when the IF3 status is authoritative (SUCCEEDED)
 * AND the resource passes runtime schema validation (Sol review #2). Missing
 * numeric values are rendered as "—" (never coerced to 0).
 * Metadata (solver / revision / checksum / load case) is shown so the result
 * can be traced to its source; STALE / INVALID results are never rendered.
 */

import type { FrameAnalysisResultResource } from "../../contracts/frameAnalysisResultResource";
import { validateFrameAnalysisResultResource } from "../../contracts/frameAnalysisResultResource";
import { extractLinearStaticResultFromIf3 } from "../modules/analysis/resultAdapter";

export interface AuthoritativeResultPanelProps {
  readonly if3Result: FrameAnalysisResultResource | null;
}

function fmt(value: number | undefined, digits = 1): string {
  return value === undefined ? "—" : value.toFixed(digits);
}

function statusOf(resource: FrameAnalysisResultResource): string {
  const status = (resource as { status?: string }).status;
  if (status !== "SUCCEEDED") {
    return status === "STALE" ? "stale" : "invalid";
  }
  const validation = validateFrameAnalysisResultResource(resource as never);
  return validation.status === "valid" && validation.issues.length === 0 ? "authoritative" : "invalid";
}

export function AuthoritativeResultPanel({ if3Result }: AuthoritativeResultPanelProps) {
  if (!if3Result) {
    return (
      <section className="next-integrity-block" data-testid="if3-result-panel">
        <h3 className="next-hint">解析結果（IF3）</h3>
        <p className="next-hint" data-testid="if3-result-empty">解析を実行すると結果を表示します。</p>
      </section>
    );
  }
  const status = statusOf(if3Result);
  if (status !== "authoritative") {
    return (
      <section className="next-integrity-block" data-testid="if3-result-panel">
        <h3 className="next-hint">解析結果（IF3）</h3>
        <p className="next-hint" data-testid="if3-result-status">status={status} — authoritative結果ではありません（表示しません）。</p>
      </section>
    );
  }

  const view = extractLinearStaticResultFromIf3(if3Result);
  const metadata = (if3Result as unknown as Record<string, unknown>);
  const maxUz = Math.max(0, ...view.displacements.map((d) => (d.uz === undefined ? 0 : Math.abs(d.uz))));
  const DEFORMATION_SCALE = 100;

  return (
    <section className="next-integrity-block" data-testid="if3-result-panel">
      <h3 className="next-hint">解析結果（IF3・authoritative）</h3>

      <dl className="next-integrity-meta" data-testid="if3-result-meta">
        <div><dt>status</dt><dd data-testid="if3-result-status">{status}</dd></div>
        <div><dt>solver</dt><dd>{String(metadata.solverName ?? "—")} {String(metadata.solverVersion ?? "")}</dd></div>
        <div><dt>sourceDocumentId</dt><dd>{String(metadata.sourceDocumentId ?? "—")}</dd></div>
        <div><dt>sourceRevision</dt><dd>{String(metadata.sourceDocumentVersion ?? "—")}</dd></div>
        <div><dt>sourceChecksum</dt><dd>{(metadata.sourceContentChecksum as { hexDigest?: string } | undefined)?.hexDigest?.slice(0, 12) ?? "—"}</dd></div>
        <div><dt>resultId</dt><dd>{String(metadata.resultId ?? "—")}</dd></div>
      </dl>

      <h4 className="next-hint">Reaction（鉛直反力・up-positive・単位 kN・node=entityId）</h4>
      <table className="next-table" data-testid="if3-reaction-table">
        <thead>
          <tr><th>node</th><th>loadCase</th><th>Fx</th><th>Fy</th><th>Fz</th><th>Mx</th><th>My</th><th>Mz</th></tr>
        </thead>
        <tbody>
          {view.reactions.length === 0 && <tr><td colSpan={8} className="next-hint">reactionなし</td></tr>}
          {view.reactions.map((r) => (
            <tr key={`${r.nodeId}:${r.loadCaseId}`} data-testid="if3-reaction-row">
              <td>{r.nodeId || "—"}</td>
              <td>{r.loadCaseId || "—"}</td>
              <td>{fmt(r.fx)}</td>
              <td>{fmt(r.fy)}</td>
              <td>{fmt(r.fz)}</td>
              <td>{fmt(r.mx)}</td>
              <td>{fmt(r.my)}</td>
              <td>{fmt(r.mz)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="next-hint">N / Q / M / T（部材端力・local axis・i/j端・kN / kNm・member=entityId）</h4>
      <table className="next-table" data-testid="if3-memberforce-table">
        <thead>
          <tr><th>member</th><th>loadCase</th><th>N=i/j fx</th><th>Q=hypot(fy,fz)</th><th>M=hypot(my,mz)</th><th>T=mx</th></tr>
        </thead>
        <tbody>
          {view.memberForces.length === 0 && <tr><td colSpan={6} className="next-hint">memberForceなし</td></tr>}
          {view.memberForces.map((mf) => (
            <tr key={`${mf.memberId}:${mf.loadCaseId}`} data-testid="if3-memberforce-row">
              <td>{mf.memberId || "—"}</td>
              <td>{mf.loadCaseId || "—"}</td>
              <td>{fmt(mf.i.fx)} / {fmt(mf.j.fx)}</td>
              <td>{fmt(mf.i.fy !== undefined && mf.i.fz !== undefined ? Math.hypot(mf.i.fy, mf.i.fz) : undefined)} / {fmt(mf.j.fy !== undefined && mf.j.fz !== undefined ? Math.hypot(mf.j.fy, mf.j.fz) : undefined)}</td>
              <td>{fmt(mf.i.my !== undefined && mf.i.mz !== undefined ? Math.hypot(mf.i.my, mf.i.mz) : undefined)} / {fmt(mf.j.my !== undefined && mf.j.mz !== undefined ? Math.hypot(mf.j.my, mf.j.mz) : undefined)}</td>
              <td>{fmt(mf.i.mx)} / {fmt(mf.j.mx)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="next-hint">Deformed Shape（最大変位・表示倍率 {DEFORMATION_SCALE} 倍）</h4>
      <dl className="next-integrity-meta" data-testid="if3-deformed-summary">
        <div><dt>node数</dt><dd>{view.displacements.length}</dd></div>
        <div><dt>最大|uz|</dt><dd>{maxUz.toFixed(4)} m</dd></div>
        <div><dt>倍率</dt><dd>{DEFORMATION_SCALE} 倍（表示専用・DERIVED・Documentへ書き戻さない）</dd></div>
      </dl>
    </section>
  );
}
