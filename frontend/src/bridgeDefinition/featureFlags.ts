const FLAG_NAME = "VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL";

export function isBridgeDefinitionStructuralModelEnabled(): boolean {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  const value = meta.env?.[FLAG_NAME];
  return value === "true";
}
