import type { DxfLayer, DxfLinetype, DxfTables, DxfTextStyle } from "../model/types";
import type { HandleAllocator } from "./handleAllocator";
import type { DxfWriter } from "./dxfWriter";

export function serializeTables(
  writer: DxfWriter,
  tables: DxfTables,
  handles: HandleAllocator,
): void {
  serializeLinetypeTable(writer, tables.linetypes, handles);
  serializeLayerTable(writer, tables.layers, handles);
  serializeTextStyleTable(writer, tables.textStyles, handles);
}

function serializeLinetypeTable(
  writer: DxfWriter,
  linetypes: readonly DxfLinetype[],
  handles: HandleAllocator,
): void {
  writer.table("LTYPE", () => {
    const tableHandle = handles.next();
    writer.pair(5, tableHandle);
    writer.pair(100, "AcDbSymbolTable");
    writer.pair(70, linetypes.length);
    for (const linetype of linetypes) {
      serializeLinetypeRecord(writer, linetype, handles);
    }
  });
}

function serializeLinetypeRecord(
  writer: DxfWriter,
  linetype: DxfLinetype,
  handles: HandleAllocator,
): void {
  writer.pair(0, "LTYPE");
  writer.pair(5, handles.next());
  writer.pair(100, "AcDbSymbolTableRecord");
  writer.pair(100, "AcDbLinetypeTableRecord");
  writer.pair(2, linetype.name);
  writer.pair(70, 0);
  writer.pair(3, linetype.description);
  writer.pair(72, 65);
  writer.pair(73, linetype.elements.length);
  writer.pair(40, linetype.patternLength);
  for (const element of linetype.elements) {
    writer.pair(49, element);
  }
}

function serializeLayerTable(
  writer: DxfWriter,
  layers: readonly DxfLayer[],
  handles: HandleAllocator,
): void {
  writer.table("LAYER", () => {
    writer.pair(5, handles.next());
    writer.pair(100, "AcDbSymbolTable");
    writer.pair(70, layers.length);
    for (const layer of layers) {
      serializeLayerRecord(writer, layer, handles);
    }
  });
}

function serializeLayerRecord(
  writer: DxfWriter,
  layer: DxfLayer,
  handles: HandleAllocator,
): void {
  writer.pair(0, "LAYER");
  writer.pair(5, handles.next());
  writer.pair(100, "AcDbSymbolTableRecord");
  writer.pair(100, "AcDbLayerTableRecord");
  writer.pair(2, layer.name);
  writer.pair(70, layer.frozen ? 1 : 0);
  writer.pair(62, layer.color);
  writer.pair(6, layer.lineType);
}

function serializeTextStyleTable(
  writer: DxfWriter,
  textStyles: readonly DxfTextStyle[],
  handles: HandleAllocator,
): void {
  writer.table("STYLE", () => {
    writer.pair(5, handles.next());
    writer.pair(100, "AcDbSymbolTable");
    writer.pair(70, textStyles.length);
    for (const style of textStyles) {
      serializeTextStyleRecord(writer, style, handles);
    }
  });
}

function serializeTextStyleRecord(
  writer: DxfWriter,
  style: DxfTextStyle,
  handles: HandleAllocator,
): void {
  writer.pair(0, "STYLE");
  writer.pair(5, handles.next());
  writer.pair(100, "AcDbSymbolTableRecord");
  writer.pair(100, "AcDbTextStyleTableRecord");
  writer.pair(2, style.name);
  writer.pair(70, 0);
  writer.pair(40, style.height);
  writer.pair(41, 1);
  writer.pair(50, 0);
  writer.pair(71, 0);
  writer.pair(42, 1);
  writer.pair(3, style.fontFile);
  writer.pair(4, "");
}
