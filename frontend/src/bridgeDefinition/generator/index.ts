export {
  createStructuralModelFromBridgeDefinition,
  validateBridgeDefinitionForStructuralModel,
} from "./structuralModelGenerator";

export {
  generateStructuralModel,
  generateStructuralModelFromLinerBridge,
} from "./facade";

export type {
  BridgeDefinitionStructuralModelDiagnostic,
  BridgeDefinitionStructuralModelOptions,
  StructuralModelGenerationResult,
} from "./structuralModelGenerator";
