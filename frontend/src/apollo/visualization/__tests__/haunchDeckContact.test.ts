import { describe, expect, it } from "vitest";
import { resolveHaunchTopOffset } from "../bridgeStructureSolids";
import { PRESENCE_STATUS } from "../../bridgeStructure/presence";
import type { ApolloHaunchConfigurationDraft } from "../../bridgeStructure/haunchTypes";

function configWithHeights(
  heights: Array<{ presence: string; height: number | null }>,
): ApolloHaunchConfigurationDraft {
  return {
    girders: heights.map((entry, index) => ({
      mainGirderKey: `girder-${index}`,
      presence: entry.presence as ApolloHaunchConfigurationDraft["girders"][number]["presence"],
      item:
        entry.height === null
          ? null
          : {
              haunchId: `h${index}`,
              startStation: 0,
              endStation: 100,
              shapeType: "RECT",
              topWidth: 0.3,
              bottomWidth: 0.3,
              height: entry.height,
              materialRef: null,
            },
    })),
  };
}

describe("resolveHaunchTopOffset", () => {
  it("returns 0 when no haunch is provided", () => {
    const config = configWithHeights([
      { presence: PRESENCE_STATUS.NOT_PROVIDED, height: null },
      { presence: PRESENCE_STATUS.EXPLICIT_NONE, height: null },
    ]);
    expect(resolveHaunchTopOffset(config)).toBe(0);
  });

  it("returns the height of a single provided haunch", () => {
    const config = configWithHeights([
      { presence: PRESENCE_STATUS.PROVIDED, height: 0.15 },
      { presence: PRESENCE_STATUS.NOT_PROVIDED, height: null },
    ]);
    expect(resolveHaunchTopOffset(config)).toBe(0.15);
  });

  it("returns the maximum height across girders", () => {
    const config = configWithHeights([
      { presence: PRESENCE_STATUS.PROVIDED, height: 0.1 },
      { presence: PRESENCE_STATUS.PROVIDED, height: 0.2 },
    ]);
    expect(resolveHaunchTopOffset(config)).toBe(0.2);
  });

  it("ignores non-provided and null heights", () => {
    const config = configWithHeights([
      { presence: PRESENCE_STATUS.NOT_PROVIDED, height: 0.9 },
      { presence: PRESENCE_STATUS.PROVIDED, height: null },
      { presence: PRESENCE_STATUS.EXPLICIT_NONE, height: 0.5 },
    ]);
    expect(resolveHaunchTopOffset(config)).toBe(0);
  });
});