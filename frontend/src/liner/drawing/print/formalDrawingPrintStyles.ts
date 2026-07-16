export const FORMAL_DRAWING_PRINT_STYLE_ID = "liner-formal-drawing-print-styles";

export const formalDrawingPrintStyles = `
@media print {
  body {
    margin: 0;
    background: #fff;
  }

  .liner-formal-workspace-page > header,
  .liner-formal-workspace-page > .liner-formal-workspace-tabs,
  .liner-formal-workspace-page > .liner-formal-workspace-page-nav,
  .liner-formal-workspace-page > .liner-formal-workspace-summary,
  .liner-formal-workspace-sidebar {
    display: none !important;
  }

  .liner-formal-workspace-layout {
    display: block !important;
    grid-template-columns: 1fr !important;
  }

  .liner-formal-workspace-canvas {
    max-height: none !important;
    min-height: auto !important;
    overflow: visible !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
  }

  .liner-formal-workspace-canvas-transform {
    transform: none !important;
  }

  .drawing-sheet-svg {
    border: none !important;
    max-width: 100% !important;
    width: 100% !important;
    height: auto !important;
    page-break-inside: avoid;
  }
}
`;
