import type { DrawingDocument } from "../model/document";
import { FORMAL_DRAWING_PRINT_STYLE_ID, formalDrawingPrintStyles } from "./formalDrawingPrintStyles";

export type PrintFormalDrawingOptions = {
  document: DrawingDocument;
  title?: string;
};

let printStylesInjected = false;

export function ensureFormalDrawingPrintStyles(): void {
  if (printStylesInjected || typeof document === "undefined") {
    return;
  }
  if (document.getElementById(FORMAL_DRAWING_PRINT_STYLE_ID)) {
    printStylesInjected = true;
    return;
  }
  const style = document.createElement("style");
  style.id = FORMAL_DRAWING_PRINT_STYLE_ID;
  style.textContent = formalDrawingPrintStyles;
  document.head.appendChild(style);
  printStylesInjected = true;
}

/** Parity hook: print uses the same DrawingDocument reference as preview and DXF. */
export function resolvePrintFormalDrawingDocument(document: DrawingDocument): DrawingDocument {
  return document;
}

export function printFormalDrawing(options: PrintFormalDrawingOptions): DrawingDocument {
  const printDocument = resolvePrintFormalDrawingDocument(options.document);
  ensureFormalDrawingPrintStyles();
  if (typeof window === "undefined" || typeof window.print !== "function") {
    return printDocument;
  }
  if (options.title && typeof document !== "undefined") {
    const previousTitle = document.title;
    document.title = options.title;
    window.print();
    document.title = previousTitle;
  } else {
    window.print();
  }
  return printDocument;
}
