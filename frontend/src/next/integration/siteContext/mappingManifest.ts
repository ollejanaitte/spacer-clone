import {
  PDC_METADATA_SLOT,
  SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION,
  type SiteContextUnificationContract,
} from "./contract";

/**
 * site-context-prototype -> spacer-clone absorption mapping manifest.
 *
 * Grounded in the current Project Data Core (frontend/src/next/project/schema.ts),
 * the terrain module contract (frontend/src/next/modules/terrainModule.ts), and the
 * existingConditions adapter location (project.metadata.existingConditions).
 * No module slot is added; site-context data is received into existing slots.
 */
export const SITE_CONTEXT_UNIFICATION_MANIFEST: SiteContextUnificationContract = {
  contractVersion: SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION,
  canonicalRepository: "spacer-clone",
  absorbedRepository: "site-context-prototype",
  decision: "spacer-clone is the canonical repository; site-context-prototype capabilities are absorbed as module/metadata payloads via the Project Data Core.",
  packageFormat: "spacerproj-json-v1",
  mapKey: "siteContextProjectV2",
  entries: [
    {
      sourceConcept: "coordinateContexts",
      targetSlot: PDC_METADATA_SLOT,
      targetLocation: "metadata.siteContextCoordinateContexts",
      required: true,
      notes: "Full CRS/coordinate context list; the primary context is mirrored into the terrain module coordinate context.",
    },
    {
      sourceConcept: "projectCoordinateContextId",
      targetSlot: PDC_METADATA_SLOT,
      targetLocation: "metadata.siteContextProjectCoordinateContextId",
      required: true,
      notes: "Active coordinate context id referenced by the mirrored terrain coordinate context.",
    },
    {
      sourceConcept: "siteContext",
      targetSlot: "terrain",
      targetLocation: "modules.terrain.data.siteContext",
      required: true,
      notes: "SiteContext root (search location, imagery, vector layers, presentation) received as module payload.",
    },
    {
      sourceConcept: "selectionArea",
      targetSlot: "terrain",
      targetLocation: "modules.terrain.data.selectionArea",
      required: false,
      notes: "Selection area (rect/polygon/viewport) is optional until a range is selected.",
    },
    {
      sourceConcept: "sourceDatasets",
      targetSlot: PDC_METADATA_SLOT,
      targetLocation: "metadata.siteContextSourceDatasets",
      required: false,
      notes: "Source dataset provenance; also feeds the terrain document source metadata.",
    },
    {
      sourceConcept: "terrain",
      targetSlot: "terrain",
      targetLocation: "modules.terrain.data.terrainDocument",
      required: false,
      notes: "SiteTerrain maps onto the existing TerrainDocument contract (terrainModule.ts).",
    },
    {
      sourceConcept: "elevationResource",
      targetSlot: "terrain",
      targetLocation: "modules.terrain.data.assetManifest",
      required: false,
      notes: "G-2: elevation binary resource is embedded into assetManifest (base64 + checksum + size) so Save → Close → Reopen restores the terrain from the project itself; surfaceReference/assetReferences reference this manifest.",
    },
    {
      sourceConcept: "existingConditions",
      targetSlot: PDC_METADATA_SLOT,
      targetLocation: "metadata.existingConditions",
      required: false,
      notes: "Reuses the existing existingConditionsAdapter storage location.",
    },
  ],
};
