import { AuthorizationBanner } from "./AuthorizationBanner";
import { TechnicalDetails } from "./TechnicalDetails";
import { getStatusLabel } from "../i18n";
/**
 * Development-only demand candidate panel (Step 1-D).
 * UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION
 * Emits CANDIDATE / UNVERIFIED / USER REVIEW REQUIRED — no formal OK/NG.
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */
import { useMemo, useState } from "react";

/** Fixed development references (closed-form / Decimal paths). Not production imports. */
const DEMAND = {
  Mmax_kNm: 4,
  Vmax_kN: 4,
  uy_m: -0.0003252032520325203,
  S_top_m3: 0.0482286272,
  S_bot_m3: 0.0482286272,
  A_web_m2: 0.02928,
} as const;

type CandidateRow = {
  readonly quantity: string;
  readonly value: number;
  readonly unit: string;
  readonly status: "CANDIDATE";
  readonly verification: "UNVERIFIED";
  readonly action: "USER REVIEW REQUIRED";
};

export function DemandCheckDevelopmentPanel() {
  const [revealed, setRevealed] = useState(false);

  const rows = useMemo<CandidateRow[]>(() => {
    const sigmaTop = DEMAND.Mmax_kNm / DEMAND.S_top_m3;
    const sigmaBot = DEMAND.Mmax_kNm / DEMAND.S_bot_m3;
    const tau = DEMAND.Vmax_kN / DEMAND.A_web_m2;
    return [
      {
        quantity: "bendingStressTop",
        value: sigmaTop,
        unit: "kN/m2",
        status: "CANDIDATE",
        verification: "UNVERIFIED",
        action: "USER REVIEW REQUIRED",
      },
      {
        quantity: "bendingStressBottom",
        value: sigmaBot,
        unit: "kN/m2",
        status: "CANDIDATE",
        verification: "UNVERIFIED",
        action: "USER REVIEW REQUIRED",
      },
      {
        quantity: "shearStressWeb",
        value: tau,
        unit: "kN/m2",
        status: "CANDIDATE",
        verification: "UNVERIFIED",
        action: "USER REVIEW REQUIRED",
      },
      {
        quantity: "deflection",
        value: DEMAND.uy_m,
        unit: "m",
        status: "CANDIDATE",
        verification: "UNVERIFIED",
        action: "USER REVIEW REQUIRED",
      },
    ];
  }, []);

  return (
    <article className="apollo-editor-card" data-testid="apollo-demand-development-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>応力度・たわみ候補（開発専用）</h2>
          <p>正式照査・OK/NGは出しません。ユーザー確認用の demand-only 候補値です。</p>
        </div>
      </div>
      <div data-testid="apollo-demand-development-warning">
        <AuthorizationBanner
          testId="apollo-demand-auth"
          keys={["UNVERIFIED_DEVELOPMENT_ONLY", "USER_REVIEW_REQUIRED", "NOT_GRANTED", "PROHIBITED"]}
        />
      </div>
      <p className="apollo-inline-hint" data-testid="apollo-demand-development-provenance">
        候補値・未検証 — 利用者確認が必要です（正式OK/NGは出しません）
      </p>
      <TechnicalDetails
        testId="apollo-demand-tech"
        lines={[
          "status=CANDIDATE",
          "verification=UNVERIFIED",
          "formalOkNg=NOT_EMITTED",
          "NUMERIC_DESIGN_AUTHORIZATION=NOT_GRANTED",
          "basis=GOLD-AN-001×GOLD-SP-001",
        ]}
      />
      <p className="apollo-inline-hint" data-testid="apollo-demand-development-basis">
        根拠は開発用参照のみです。
      </p>
      <div className="apollo-workspace-actions">
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-demand-reveal-candidates"
          onClick={() => setRevealed(true)}
        >
          候補値を表示
        </button>
      </div>
      {revealed ? (
        <table className="apollo-detail-table" data-testid="apollo-demand-development-table">
          <thead>
            <tr>
              <th>quantity</th>
              <th>value</th>
              <th>unit</th>
              <th>status</th>
              <th>verification</th>
              <th>action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.quantity}>
                <td>{row.quantity}</td>
                <td data-testid={`apollo-demand-value-${row.quantity}`}>{row.value}</td>
                <td>{row.unit}</td>
                <td>{row.status}</td>
                <td>{row.verification}</td>
                <td>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </article>
  );
}
