// Phase C1 (M3-02) Reference Bridge 001 接続検証
// reaction_candidate.csv 由来の反力値を support-interface 入力データとして読込み、
// bearingSeats / reactionCases が下部工側へ正しく接続されることを確認する。
// 値は EXCLUDED_ANALYSIS_RESULT（入力参照データ）であり設計照査値ではない。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  parseSupportInterface,
  bearingSeatsToModel,
  interfaceToReactions,
  validateSuperstructureInput,
} from "../design/superstructureInterface";
import { buildSuperstructureEnvelope } from "../design/superstructureEnvelope";

const FIXTURE = join(
  __dirname,
  "fixtures",
  "reference-bridge-001-support-interface.json",
);

describe("Reference Bridge 001 support-interface connection", () => {
  const doc = JSON.parse(readFileSync(FIXTURE, "utf8"));

  it("parses the reference bridge interface (fail-open validated)", () => {
    const result = parseSupportInterface(JSON.stringify(doc));
    expect(result.ok).toBe(true);
    expect(result.value!.supportId).toBe("PR1");
    expect(result.value!.reactionCases).toHaveLength(4);
  });

  it("maps bearing seats to model BearingSeat with supportId sync", () => {
    const seats = bearingSeatsToModel("PR1", doc.bearingSeats);
    expect(seats.map((s) => s.bearing.id)).toEqual(["PR1-BRG-01", "PR1-BRG-02"]);
    expect(seats[0].seatId).toBe("PR1-SEAT-01");
  });

  it("preserves reaction input data (dead/live/wind/seismic)", () => {
    const reactions = interfaceToReactions(doc);
    expect(reactions.supportId).toBe("PR1");
    const kinds = reactions.cases.map((c) => c.caseKind);
    expect(kinds).toEqual([
      "permanent",
      "liveLoad",
      "wind",
      "seismicLevel1",
    ]);
    const dl = reactions.cases.find((c) => c.caseId === "DL-AG1")!;
    expect(dl.force?.z).toBe(-3325.5);
    const seismic = reactions.cases.find((c) => c.caseKind === "seismicLevel1")!;
    expect(seismic.force?.y).toBe(-1824.37);
  });

  it("passes superstructure input validation", () => {
    expect(validateSuperstructureInput(doc)).toEqual([]);
  });

  it("builds a superstructure envelope anchored on reference supports", () => {
    const pr2 = {
      ...doc,
      supportId: "PR2",
      position: { x: 60, y: 0, z: 0 },
      bearingSeats: [
        { bearingId: "PR2-BRG-01", bearingPosition: { x: 0, y: -2.5, z: 8.0 }, bearingHeight: 0.2 },
        { bearingId: "PR2-BRG-02", bearingPosition: { x: 0, y: 2.5, z: 8.0 }, bearingHeight: 0.2 },
      ],
    };
    const result = buildSuperstructureEnvelope({
      superstructures: [doc, pr2],
      supportPositions: new Map([
        ["PR1", { x: 30, y: 0, z: 0 }],
        ["PR2", { x: 60, y: 0, z: 0 }],
      ]),
    });
    expect(result.ok).toBe(true);
    const solids = result.group!.solids;
    expect(solids.some((s) => s.entity === "superstructure")).toBe(true);
    const girder = solids.find((s) => s.id === "SUPERSTRUCTURE-GIRDER");
    expect(girder).toBeDefined();
    expect(girder!.localSize.x).toBeCloseTo(30, 6);
  });
});
