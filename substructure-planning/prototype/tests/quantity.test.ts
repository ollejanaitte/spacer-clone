import { describe, it, expect } from "vitest";
import { defaultProject } from "../src/defaultProject";
import { computeProjectQuantity } from "../src/quantity";
import type { Pier } from "../src/model";

describe("概算数量 (quantity)", () => {
  it("既定プロジェクトの数量が正の値", () => {
    const q = computeProjectQuantity(defaultProject().supports);
    expect(q.columnVolume).toBeGreaterThan(0);
    expect(q.capVolume).toBeGreaterThan(0);
    expect(q.footingVolume).toBeGreaterThan(0);
    expect(q.pileVolume).toBeGreaterThan(0);
    expect(q.totalConcreteVolume).toBeCloseTo(
      q.columnVolume + q.capVolume + q.footingVolume + q.pileVolume
    );
    expect(q.totalPileLength).toBeGreaterThan(0);
    expect(q.note).toContain("未検証");
  });

  it("柱体積 = width*depth*height", () => {
    const pier = defaultProject().supports[0].pier as Pier;
    const q = computeProjectQuantity([{ ...defaultProject().supports[0], pier }]);
    expect(q.columnVolume).toBeCloseTo(pier.column.width * pier.column.depth * pier.column.height);
  });

  it("杭総延長 = 本数 * 杭長", () => {
    const pier = defaultProject().supports[0].pier as Pier;
    const q = computeProjectQuantity([{ ...defaultProject().supports[0], pier }]);
    expect(q.totalPileLength).toBeCloseTo((pier.piles?.pileCount ?? 0) * (pier.piles?.length ?? 0));
  });

  it("杭体積 = πr² × L × 本数", () => {
    const pier = defaultProject().supports[0].pier as Pier;
    const q = computeProjectQuantity([{ ...defaultProject().supports[0], pier }]);
    const r = (pier.piles?.diameter ?? 0) / 2;
    expect(q.pileVolume).toBeCloseTo(Math.PI * r * r * (pier.piles?.length ?? 0) * (pier.piles?.pileCount ?? 0));
  });
});
