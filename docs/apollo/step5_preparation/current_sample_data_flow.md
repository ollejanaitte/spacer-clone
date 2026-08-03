# 06 — Current Geometry Source Map

| Stage | Owner module | Notes |
|-------|--------------|-------|
| Canonical draft | `bridgeStructure/types` + panels | SoR for dimensions/presence |
| BSDD document | `generateBsdd.ts` | StructuralDesignModel entities |
| Geometry kernel (app/haunch) | `appurtenanceGeometry.ts` / `haunchGeometry.ts` | Shared L/A/V |
| Solids | `bridgeStructureSolids.ts` + `appurtenanceHaunchSolids.ts` | Placement formulas live here (risk for UI duplication) |
| Viewer | `SceneBuilder` / `ApolloVisualizationRenderer` | Visibility groups |
| STL | `apolloStlExport.ts` | Group filter + box/cylinder geom |
| Quantity | `quantityModel.ts` + app/haunch quantities | Same kernel for app/haunch |
| Load | `appurtenanceHaunchLoadModel.ts` | DEC-S4-0010 distribution |
| Analysis | probe FE + closed-form adapter | Partial UDL closed-form |

Road/LINER: separate `project.liner` path; not bound into bridge solids (Step 4-E).
