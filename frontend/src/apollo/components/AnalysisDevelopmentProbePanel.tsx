import { AuthorizationBanner } from "./AuthorizationBanner";
import { TechnicalDetails } from "./TechnicalDetails";
import { getStatusLabel } from "../i18n";
/**
 * Development-only simple-span analysis probe.
 * UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */
import { useState } from "react";

type ProbeCase = "GOLD-AN-001" | "GOLD-AN-002";

type ProbeRow = {
  readonly label: string;
  readonly expected: number;
  readonly actual: number | null;
};

const REFERENCE = {
  "GOLD-AN-001": {
    leftReaction_fy_kN: 4,
    rightReaction_fy_kN: 4,
    Mmax_kNm: 4,
    centerDeflection_uy_m: -0.0003252032520325203252032520325203252032520325203252032520325203252032520325203252,
  },
  "GOLD-AN-002": {
    leftReaction_fy_kN: 5,
    rightReaction_fy_kN: 5,
    Mmax_kNm: 10,
    // PL^3/(48EI) with L=4, P=10, E=205e6, I=1e-4 — matches independent_analytical_reference.py
    centerDeflection_uy_m: -0.0006504065040650406504065040650406504065040650406504065040650406504065040650406504,
  },
} as const;

function buildCenterPointProject() {
  const L = 4.0;
  const E = 205_000_000.0;
  const I = 0.0001;
  const P = 10.0;
  const A = 0.02;
  const G = E / (2.0 * (1.0 + 0.3));
  return {
    project: {
      id: "dev-gold-an-002",
      name: "DEV GOLD-AN-002",
      schemaVersion: "1.0.0",
      description: "development-only",
      createdAt: "2026-08-02T00:00:00Z",
      updatedAt: "2026-08-02T00:00:00Z",
    },
    units: {
      length: "m",
      force: "kN",
      moment: "kN_m",
      modulus: "kN_per_m2",
      area: "m2",
      inertia: "m4",
    },
    nodes: [
      { id: "N1", x: 0.0, y: 0.0, z: 0.0 },
      { id: "N2", x: L / 2.0, y: 0.0, z: 0.0 },
      { id: "N3", x: L, y: 0.0, z: 0.0 },
    ],
    materials: [
      {
        id: "MAT1",
        name: "Steel",
        elasticModulus: E,
        shearModulus: G,
        poissonRatio: 0.3,
        density: 0.0,
      },
    ],
    sections: [{ id: "SEC1", name: "Verification Section", area: A, iy: I, iz: I, j: 0.00005 }],
    members: [
      {
        id: "M1",
        nodeI: "N1",
        nodeJ: "N2",
        materialId: "MAT1",
        sectionId: "SEC1",
        orientationVector: { x: 0.0, y: 1.0, z: 0.0 },
      },
      {
        id: "M2",
        nodeI: "N2",
        nodeJ: "N3",
        materialId: "MAT1",
        sectionId: "SEC1",
        orientationVector: { x: 0.0, y: 1.0, z: 0.0 },
      },
    ],
    supports: [
      { nodeId: "N1", ux: true, uy: true, uz: true, rx: true, ry: true, rz: false },
      { nodeId: "N3", ux: false, uy: true, uz: true, rx: true, ry: true, rz: false },
    ],
    loadCases: [{ id: "LC1", name: "LC1", type: "static" }],
    nodalLoads: [
      { id: "NL1", loadCaseId: "LC1", nodeId: "N2", fx: 0.0, fy: -P, fz: 0.0, mx: 0.0, my: 0.0, mz: 0.0 },
    ],
    memberLoads: [],
    massCases: [],
    analysisSettings: {
      analysisType: "linear_static",
      solver: "scipy_sparse",
      includeShearDeformation: false,
      largeDisplacement: false,
      tolerance: 1e-9,
    },
  };
}

function buildUdlProject() {
  const project = buildCenterPointProject();
  return {
    ...project,
    project: { ...project.project, id: "dev-gold-an-001", name: "DEV GOLD-AN-001" },
    nodalLoads: [],
    memberLoads: [
      {
        id: "ML1",
        loadCaseId: "LC1",
        memberId: "M1",
        coordinateSystem: "local",
        type: "uniform",
        wx: 0.0,
        wy: -2.0,
        wz: 0.0,
      },
      {
        id: "ML2",
        loadCaseId: "LC1",
        memberId: "M2",
        coordinateSystem: "local",
        type: "uniform",
        wx: 0.0,
        wy: -2.0,
        wz: 0.0,
      },
    ],
  };
}

function byId<T extends { nodeId: string }>(rows: readonly T[], id: string): T | undefined {
  return rows.find((row) => row.nodeId === id);
}

export function AnalysisDevelopmentProbePanel() {
  const [activeCase, setActiveCase] = useState<ProbeCase>("GOLD-AN-001");
  const [rows, setRows] = useState<ProbeRow[] | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);

  const runProbe = async (caseId: ProbeCase) => {
    setActiveCase(caseId);
    setStatus("running");
    setError(null);
    try {
      const project = caseId === "GOLD-AN-001" ? buildUdlProject() : buildCenterPointProject();
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, loadCaseId: "LC1" }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as {
        result: {
          analysisSummary: { status: string };
          displacements: Array<{ nodeId: string; uy: number }>;
          reactions: Array<{ nodeId: string; fy: number }>;
          memberEndForces: Array<{ i: { mz: number }; j: { mz: number } }>;
          errors: Array<{ message: string }>;
        };
      };
      const result = payload.result;
      if (result.analysisSummary.status !== "success") {
        throw new Error(result.errors.map((entry) => entry.message).join("; ") || "analysis failed");
      }
      const center = byId(result.displacements, "N2");
      const left = byId(result.reactions, "N1");
      const right = byId(result.reactions, "N3");
      const maxAbsMz = Math.max(
        ...result.memberEndForces.flatMap((force) => [Math.abs(force.i.mz), Math.abs(force.j.mz)]),
      );
      const expected = REFERENCE[caseId];
      setRows([
        {
          label: "leftReaction_fy_kN",
          expected: expected.leftReaction_fy_kN,
          actual: left?.fy ?? null,
        },
        {
          label: "rightReaction_fy_kN",
          expected: expected.rightReaction_fy_kN,
          actual: right?.fy ?? null,
        },
        { label: "Mmax_kNm", expected: expected.Mmax_kNm, actual: maxAbsMz },
        {
          label: "centerDeflection_uy_m",
          expected: expected.centerDeflection_uy_m,
          actual: center?.uy ?? null,
        },
      ]);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
      setRows(null);
    }
  };

  return (
    <article className="apollo-editor-card" data-testid="apollo-analysis-development-probe">
      <div className="apollo-editor-card-header">
        <div>
          <h2>解析プローブ（開発専用）</h2>
          <p>単純支持梁の閉形式参照と live solver 比較。正式設計には使用しないでください。</p>
        </div>
      </div>
      <div data-testid="apollo-analysis-development-warning">
        <AuthorizationBanner testId="apollo-analysis-probe-auth" />
      </div>
      <p className="apollo-inline-hint" data-testid="apollo-analysis-development-provenance">
        正式認可なし — 開発用解析プローブ
      </p>
      <TechnicalDetails
        testId="apollo-analysis-probe-tech"
        lines={["authorization=NOT_AUTHORIZED", "NUMERIC_DESIGN_AUTHORIZATION=NOT_GRANTED", "solver=scipy_sparse"]}
      />
      <div className="apollo-workspace-actions">
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-analysis-run-gold-an-001"
          onClick={() => void runProbe("GOLD-AN-001")}
        >
          Run GOLD-AN-001 (UDL)
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-analysis-run-gold-an-002"
          onClick={() => void runProbe("GOLD-AN-002")}
        >
          Run GOLD-AN-002 (center P)
        </button>
      </div>
      <p data-testid="apollo-analysis-development-status">status: {status} / case: {activeCase}</p>
      {error ? (
        <p className="apollo-input-error" role="alert" data-testid="apollo-analysis-development-error">
          {error}
        </p>
      ) : null}
      {rows ? (
        <table className="apollo-detail-table" data-testid="apollo-analysis-development-table">
          <thead>
            <tr>
              <th>quantity</th>
              <th>closed-form expected</th>
              <th>engine actual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.expected}</td>
                <td>{row.actual}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </article>
  );
}
