import type { WorkspaceSection } from "../workspace/sections";

export const LINER_TOOL_ROUTE = "/pro/linear-coordinate";
export const LINER_LIST_ROUTE = "/pro/liner";
export const LINER_MAIN3D_ROUTE = "/pro/liner/main3d";
export const APOLLO_ROUTE = "/pro/apollo";
export const SUBSTRUCTURE_ROUTE = "/pro/liner/substructure";
export const FEM_SHELL_ROUTE = "/pro";
export const QUICK_ANALYSIS_ROUTE = "/pro";

export interface ToolBindingDescriptor {
  readonly section: WorkspaceSection;
  readonly route: string;
  readonly available: boolean;
  readonly toolName: string;
}

export interface ToolBindings {
  readonly resolveBinding: (section: WorkspaceSection) => ToolBindingDescriptor | null;
  readonly availableTools: () => readonly ToolBindingDescriptor[];
}

export function createToolBindings(): ToolBindings {
  const bindings: readonly ToolBindingDescriptor[] = [
    { section: "road", route: LINER_TOOL_ROUTE, available: true, toolName: "LINER" },
    {
      section: "superstructure",
      route: APOLLO_ROUTE,
      available: true,
      toolName: "Apollo",
    },
    {
      section: "substructure",
      route: SUBSTRUCTURE_ROUTE,
      available: true,
      toolName: "Substructure",
    },
    {
      section: "analysis",
      route: FEM_SHELL_ROUTE,
      available: true,
      toolName: "FEM / Analysis",
    },
    {
      section: "main3d",
      route: LINER_MAIN3D_ROUTE,
      available: true,
      toolName: "Main3D",
    },
  ];

  const bySection = new Map<WorkspaceSection, ToolBindingDescriptor>(
    bindings.map((binding) => [binding.section, binding]),
  );

  return {
    resolveBinding(section: WorkspaceSection): ToolBindingDescriptor | null {
      return bySection.get(section) ?? null;
    },
    availableTools(): readonly ToolBindingDescriptor[] {
      return bindings;
    },
  };
}
