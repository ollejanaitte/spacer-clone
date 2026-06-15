import { describe, expect, it } from "vitest";
import { createDefaultProject, createSuspendedDeckProject } from "../data/defaultProject";
import {
  isPierBase,
  isSoftPierBase,
  isSuspendedBearingMember,
  isSuspendedJunctionNode,
  memberColorForMember,
  resolveMemberColorMode,
  ROCK_COLOR,
  SOFT_COLOR,
  SUSPENDED_COLOR,
} from "./colorCoding";

describe("resolveMemberColorMode", () => {
  it("returns ground for the default bridge project (auto)", () => {
    const project = createDefaultProject();
    expect(resolveMemberColorMode(project, "auto")).toBe("ground");
  });

  it("returns ground for the suspended variant (auto)", () => {
    const project = createSuspendedDeckProject();
    expect(resolveMemberColorMode(project, "auto")).toBe("ground");
  });

  it("respects an explicit default override", () => {
    const project = createDefaultProject();
    expect(resolveMemberColorMode(project, "default")).toBe("default");
  });

  it("respects an explicit ground override", () => {
    const project = createDefaultProject();
    expect(resolveMemberColorMode(project, "ground")).toBe("ground");
  });
});

describe("memberColorForMember (continuous)", () => {
  const project = createDefaultProject();

  it("colors a rock pier blue", () => {
    // MP1 is G1-B1 (B1 = rock)
    const color = memberColorForMember(project, "MP1", "G1", "B1", "auto", false);
    expect(color).toBe(ROCK_COLOR);
  });

  it("colors a soft pier red", () => {
    // MP3 is G3-B3 (B3 = soft)
    const color = memberColorForMember(project, "MP3", "G3", "B3", "auto", false);
    expect(color).toBe(SOFT_COLOR);
  });

  it("keeps deck members in the default blue when nothing special is connected", () => {
    // MG0 is G0-G1, neither is a pier base
    const color = memberColorForMember(project, "MG0", "G0", "G1", "auto", false);
    expect(color).toBe("#2f6f9f");
  });
});

describe("memberColorForMember (suspended)", () => {
  const project = createSuspendedDeckProject();

  it("colors the suspended bearings yellow", () => {
    const left = memberColorForMember(project, "MBR3L", "G3L", "P3TOP", "auto", false);
    const right = memberColorForMember(project, "MBR3R", "G3R", "P3TOP", "auto", false);
    expect(left).toBe(SUSPENDED_COLOR);
    expect(right).toBe(SUSPENDED_COLOR);
  });

  it("highlights deck members touching the suspended junction in yellow", () => {
    const color = memberColorForMember(project, "MG_L2", "G2", "G3L", "auto", false);
    expect(color).toBe(SUSPENDED_COLOR);
  });
});

describe("selected member override", () => {
  const project = createDefaultProject();
  it("uses the suspended color (yellow) for the selected member regardless of role", () => {
    const color = memberColorForMember(project, "MG0", "G0", "G1", "auto", true);
    expect(color).toBe(SUSPENDED_COLOR);
  });
});

describe("identifier helpers", () => {
  it("detects pier bases", () => {
    expect(isPierBase("B1")).toBe(true);
    expect(isPierBase("B2")).toBe(true);
    expect(isPierBase("B3")).toBe(true);
    expect(isPierBase("B4")).toBe(true);
    expect(isPierBase("G1")).toBe(false);
  });

  it("detects soft piers", () => {
    expect(isSoftPierBase("B3")).toBe(true);
    expect(isSoftPierBase("B4")).toBe(true);
    expect(isSoftPierBase("B1")).toBe(false);
  });

  it("detects suspended junction nodes", () => {
    expect(isSuspendedJunctionNode("G3L")).toBe(true);
    expect(isSuspendedJunctionNode("G3R")).toBe(true);
    expect(isSuspendedJunctionNode("P3TOP")).toBe(true);
    expect(isSuspendedJunctionNode("G0")).toBe(false);
  });

  it("detects suspended bearing members", () => {
    expect(isSuspendedBearingMember("MBR3L")).toBe(true);
    expect(isSuspendedBearingMember("MBR3R")).toBe(true);
    expect(isSuspendedBearingMember("MG0")).toBe(false);
  });
});