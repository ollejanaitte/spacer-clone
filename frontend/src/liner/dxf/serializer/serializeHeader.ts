import type { DxfHeader } from "../model/types";
import { DXF_INSUNITS_BY_UNIT } from "../model/units";
import type { DxfWriter } from "./dxfWriter";

export function serializeHeader(writer: DxfWriter, header: DxfHeader): void {
  writer.pair(9, "$ACADVER");
  writer.pair(1, header.acadVer);
  writer.pair(9, "$DWGCODEPAGE");
  writer.pair(3, header.dwgCodepage);
  writer.pair(9, "$INSUNITS");
  writer.pair(70, DXF_INSUNITS_BY_UNIT[header.units]);
  writer.pair(9, "$MEASUREMENT");
  writer.pair(70, header.measurement);
}
