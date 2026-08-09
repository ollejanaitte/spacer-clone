export const WORKSPACE_SECTIONS = [
  "overview",
  "road",
  "superstructure",
  "substructure",
  "analysis",
  "main3d",
  "deliverables",
  "data",
] as const;

export type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];

export function isWorkspaceSection(value: string): value is WorkspaceSection {
  return (WORKSPACE_SECTIONS as readonly string[]).includes(value);
}
