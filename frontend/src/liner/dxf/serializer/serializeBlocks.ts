import type { DxfWriter } from "./dxfWriter";

export function serializeBlocks(_writer: DxfWriter): void {
  // Empty BLOCKS section; model/paper blocks are out of scope for Step3 PR1.
}
