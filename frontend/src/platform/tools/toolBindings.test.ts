import { describe, expect, it } from "vitest";
import {
  APOLLO_ROUTE,
  FEM_SHELL_ROUTE,
  LINER_LIST_ROUTE,
  LINER_MAIN3D_ROUTE,
  LINER_TOOL_ROUTE,
  SUBSTRUCTURE_ROUTE,
  createToolBindings,
} from "./toolBindings";

describe("createToolBindings", () => {
  it("binds road to LINER launcher", () => {
    const bindings = createToolBindings();
    const binding = bindings.resolveBinding("road");
    expect(binding).not.toBeNull();
    expect(binding?.route).toBe(LINER_TOOL_ROUTE);
    expect(binding?.toolName).toBe("LINER");
    expect(binding?.available).toBe(true);
  });

  it("binds superstructure to Apollo", () => {
    const bindings = createToolBindings();
    const binding = bindings.resolveBinding("superstructure");
    expect(binding?.route).toBe(APOLLO_ROUTE);
  });

  it("binds substructure to Substructure", () => {
    const bindings = createToolBindings();
    const binding = bindings.resolveBinding("substructure");
    expect(binding?.route).toBe(SUBSTRUCTURE_ROUTE);
  });

  it("binds analysis to FEM shell", () => {
    const bindings = createToolBindings();
    const binding = bindings.resolveBinding("analysis");
    expect(binding?.route).toBe(FEM_SHELL_ROUTE);
  });

  it("binds main3d to Main3D", () => {
    const bindings = createToolBindings();
    const binding = bindings.resolveBinding("main3d");
    expect(binding?.route).toBe(LINER_MAIN3D_ROUTE);
  });

  it("returns null for non-tool sections", () => {
    const bindings = createToolBindings();
    expect(bindings.resolveBinding("overview")).toBeNull();
    expect(bindings.resolveBinding("deliverables")).toBeNull();
    expect(bindings.resolveBinding("data")).toBeNull();
  });

  it("exposes the available tools list", () => {
    const bindings = createToolBindings();
    const tools = bindings.availableTools();
    expect(tools).toHaveLength(5);
    expect(tools.map((tool) => tool.section)).toEqual([
      "road",
      "superstructure",
      "substructure",
      "analysis",
      "main3d",
    ]);
  });
});
