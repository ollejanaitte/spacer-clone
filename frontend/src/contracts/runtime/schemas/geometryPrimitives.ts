import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { finiteNumberSchema } from "./primitives";

export const point3Schema = z.strictObject({
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  z: finiteNumberSchema,
});

export const polyline3Schema = z.strictObject({
  points: z.array(point3Schema).min(2),
});

export const polygon3Schema = z.strictObject({
  vertices: z.array(point3Schema).min(3),
});

export type Point3Value = z.infer<typeof point3Schema>;
export type Polyline3Value = z.infer<typeof polyline3Schema>;
export type Polygon3Value = z.infer<typeof polygon3Schema>;

point3Schema.meta({
  id: contractSchemaId("point3"),
  title: "Point3",
  contractVersion: SHARED_CONTRACT_VERSION,
});

polyline3Schema.meta({
  id: contractSchemaId("polyline3"),
  title: "Polyline3",
  contractVersion: SHARED_CONTRACT_VERSION,
});

polygon3Schema.meta({
  id: contractSchemaId("polygon3"),
  title: "Polygon3",
  contractVersion: SHARED_CONTRACT_VERSION,
});
