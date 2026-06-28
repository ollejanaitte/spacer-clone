import { primitives } from "@jscad/modeling";
import { serialize } from "@jscad/stl-serializer";
import type { ProjectModel } from "../../types";

const DEFAULT_MEMBER_RADIUS = 0.05;
type CylinderBetweenPoints = (options: {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  segments: number;
}) => unknown;

export function buildLinerFrameStl(project: ProjectModel): string {
  const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
  const cylinderBetweenPoints = primitives.cylinder as CylinderBetweenPoints;
  const memberGeometries = project.members
    .map((member) => {
      const start = nodeById.get(member.nodeI);
      const end = nodeById.get(member.nodeJ);
      if (!start || !end) {
        return null;
      }
      const length = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
      if (length <= 0) {
        return null;
      }

      return cylinderBetweenPoints({
        start: [start.x, start.y, start.z],
        end: [end.x, end.y, end.z],
        radius: DEFAULT_MEMBER_RADIUS,
        segments: 12,
      });
    })
    .filter((geometry): geometry is NonNullable<typeof geometry> => Boolean(geometry));

  if (memberGeometries.length === 0) {
    return "solid LINER_FRAME\nendsolid LINER_FRAME\n";
  }

  return serialize({ binary: false }, memberGeometries).join("");
}
