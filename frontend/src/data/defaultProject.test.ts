import { describe, expect, it } from "vitest";
import {
  BRIDGE_DECK_Y,
  BRIDGE_NUM_SPANS,
  BRIDGE_PIER_HEIGHT,
  BRIDGE_SOFT_PIERS,
  BRIDGE_SUSPENDED_OFFSET,
  BRIDGE_TOTAL_LENGTH,
  createDefaultProject,
  createSuspendedDeckProject,
  describeBridgeVariant,
  pierBaseGroundCondition,
} from "./defaultProject";

describe("createDefaultProject (Plan A: continuous)", () => {
  const project = createDefaultProject();

  it("names the project Plan A", () => {
    expect(project.project.name.toLowerCase()).toContain("continuous");
  });

  it("places 5 spans and 30m segments on the X axis", () => {
    const xs = project.nodes.filter((n) => n.id.startsWith("G")).map((n) => n.x).sort((a, b) => a - b);
    expect(xs).toHaveLength(BRIDGE_NUM_SPANS + 1);
    for (let i = 0; i <= BRIDGE_NUM_SPANS; i += 1) {
      expect(xs[i]).toBeCloseTo(i * 30);
    }
    expect(xs[xs.length - 1]).toBeCloseTo(BRIDGE_TOTAL_LENGTH);
  });

  it("keeps deck nodes at the pier height and pier bases at y=0", () => {
    for (const node of project.nodes) {
      if (node.id.startsWith("G")) {
        expect(node.y).toBeCloseTo(BRIDGE_PIER_HEIGHT);
        expect(node.y).toBeCloseTo(BRIDGE_DECK_Y);
        expect(node.z).toBeCloseTo(0);
      } else if (node.id.startsWith("B")) {
        expect(node.y).toBeCloseTo(0);
        expect(node.z).toBeCloseTo(0);
      }
    }
  });

  it("uses the same nodes for deck and pier top in the continuous variant", () => {
    expect(project.nodes.some((n) => n.id === "G3L")).toBe(false);
    expect(project.nodes.some((n) => n.id === "G3R")).toBe(false);
    expect(project.nodes.some((n) => n.id === "P3TOP")).toBe(false);
  });

  it("describes the variant as continuous with 4 piers (2 rock + 2 soft)", () => {
    const info = describeBridgeVariant(project);
    expect(info.variant).toBe("continuous");
    expect(info.spanCount).toBe(BRIDGE_NUM_SPANS);
    expect(info.totalLength).toBeCloseTo(BRIDGE_TOTAL_LENGTH);
    expect(info.rockPierCount).toBe(2);
    expect(info.softPierCount).toBe(2);
    expect(info.suspendedJunctionCount).toBe(0);
  });
});

describe("createSuspendedDeckProject (Plan B: suspended)", () => {
  const project = createSuspendedDeckProject();

  it("names the project Plan B", () => {
    expect(project.project.name.toLowerCase()).toContain("suspended");
  });

  it("splits the deck at P3 into G3L and G3R with the suspended offset", () => {
    const g3l = project.nodes.find((n) => n.id === "G3L");
    const g3r = project.nodes.find((n) => n.id === "G3R");
    const p3top = project.nodes.find((n) => n.id === "P3TOP");
    expect(g3l).toBeDefined();
    expect(g3r).toBeDefined();
    expect(p3top).toBeDefined();
    expect(g3l!.x).toBeCloseTo(90);
    expect(g3r!.x).toBeCloseTo(90);
    expect(g3l!.z).toBeCloseTo(-BRIDGE_SUSPENDED_OFFSET);
    expect(g3r!.z).toBeCloseTo(BRIDGE_SUSPENDED_OFFSET);
    expect(p3top!.x).toBeCloseTo(90);
    expect(p3top!.y).toBeCloseTo(BRIDGE_PIER_HEIGHT);
    expect(p3top!.z).toBeCloseTo(0);
  });

  it("does not share nodes between the left and right deck halves", () => {
    const leftIds = new Set(["G3L"]);
    const rightIds = new Set(["G3R"]);
    for (const member of project.members) {
      const a = member.nodeI;
      const b = member.nodeJ;
      if (leftIds.has(a) && rightIds.has(b)) {
        throw new Error("Suspended variant shares a node between the left and right halves");
      }
      if (leftIds.has(b) && rightIds.has(a)) {
        throw new Error("Suspended variant shares a node between the left and right halves");
      }
    }
  });

  it("uses separate bearings from G3L and G3R to the shared P3TOP pier top", () => {
    const memberIds = project.members.map((m) => m.id);
    expect(memberIds).toContain("MBR3L");
    expect(memberIds).toContain("MBR3R");
    const mbr3l = project.members.find((m) => m.id === "MBR3L")!;
    const mbr3r = project.members.find((m) => m.id === "MBR3R")!;
    expect(mbr3l.nodeI === "G3L" || mbr3l.nodeJ === "G3L").toBe(true);
    expect(mbr3l.nodeI === "P3TOP" || mbr3l.nodeJ === "P3TOP").toBe(true);
    expect(mbr3r.nodeI === "G3R" || mbr3r.nodeJ === "G3R").toBe(true);
    expect(mbr3r.nodeI === "P3TOP" || mbr3r.nodeJ === "P3TOP").toBe(true);
  });

  it("describes the variant as suspended with one suspended junction", () => {
    const info = describeBridgeVariant(project);
    expect(info.variant).toBe("suspended");
    expect(info.suspendedJunctionCount).toBe(1);
    expect(info.pierCount).toBe(4);
  });
});

describe("pierBaseGroundCondition", () => {
  it("labels B1, B2 as rock and B3, B4 as soft", () => {
    expect(pierBaseGroundCondition("B1")).toBe("rock");
    expect(pierBaseGroundCondition("B2")).toBe("rock");
    expect(pierBaseGroundCondition("B3")).toBe("soft");
    expect(pierBaseGroundCondition("B4")).toBe("soft");
  });

  it("keeps the soft piers list aligned with the soft behavior", () => {
    for (const pierId of BRIDGE_SOFT_PIERS) {
      expect(pierBaseGroundCondition(pierId)).toBe("soft");
    }
  });
});

describe("mutability guards", () => {
  it("returns independent project objects on repeated calls", () => {
    const a = createDefaultProject();
    const b = createDefaultProject();
    expect(a).not.toBe(b);
    expect(a.nodes).not.toBe(b.nodes);
    a.nodes[0].x = 999;
    expect(b.nodes[0].x).not.toBe(999);
  });

  it("does not mutate the default project when suspended variant is built", () => {
    const a = createDefaultProject();
    createSuspendedDeckProject();
    expect(a.nodes.find((n) => n.id === "G3L")).toBeUndefined();
    expect(a.nodes.find((n) => n.id === "G3R")).toBeUndefined();
  });
});