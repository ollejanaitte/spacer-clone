import { describe, expect, it } from "vitest";
import {
  SAMPLING_INTERVAL_DISPLAY,
  SAMPLING_INTERVAL_DXF,
  SAMPLING_INTERVAL_FRAME,
} from "../sampling";
import { applyCrossSlope, mergeCrossSectionZ } from "../crossSectionZMerge";
import {
  sampleCrossSectionDisplay,
  sampleCrossSectionDxf,
  sampleCrossSectionFrame,
  type CrossSectionSamplePoint,
} from "../crossSectionSampling";
import type { CrossSectionTemplateDraft, GridDefinitionDraft } from "../../schema/types";

function goldenTemplate(): CrossSectionTemplateDraft {
  return {
    id: "golden-cross-section",
    name: "Golden cross section",
    offsetLines: [
      { id: "offset-left", offset: -5, elevation: 0.2 },
      { id: "offset-center", offset: 0, elevation: 0 },
      { id: "offset-right", offset: 5, elevation: -0.1 },
    ],
  };
}

function goldenGridDefinition(
  startPhysicalDistance: number,
  endPhysicalDistance: number,
): GridDefinitionDraft {
  return {
    id: "golden-grid",
    crossSectionTemplateId: "golden-cross-section",
    stationRange: {
      startPhysicalDistance,
      endPhysicalDistance,
    },
  };
}

function expectedStations(start: number, end: number, interval: number): number[] {
  const stations: number[] = [];
  for (let station = start; station < end; station += interval) {
    stations.push(station);
  }

  const last = stations[stations.length - 1];
  if (last === undefined || last !== end) {
    stations.push(end);
  }

  return stations;
}

function expectSampleStations(
  samples: CrossSectionSamplePoint[],
  start: number,
  end: number,
  interval: number,
): void {
  const expected = expectedStations(start, end, interval);
  expect(samples).toHaveLength(expected.length);
  expect(samples.map((sample) => sample.station)).toEqual(expected);
  expect(samples[0]?.station).toBe(start);
  expect(samples[samples.length - 1]?.station).toBe(end);
}

describe("cross section golden tests", () => {
  describe("applyCrossSlope (Pre-Decision #3)", () => {
    it("applies right-down-positive sign convention for positive slope", () => {
      expect(applyCrossSlope(3, 2)).toBeCloseTo(-0.06, 9);
      expect(applyCrossSlope(-3, 2)).toBeCloseTo(0.06, 9);
    });

    it("inverts delta when slope sign flips (superelevation inversion cases)", () => {
      expect(applyCrossSlope(3, -2)).toBeCloseTo(0.06, 9);
      expect(applyCrossSlope(-3, -2)).toBeCloseTo(-0.06, 9);
    });

    it("returns zero for zero slope or non-finite inputs", () => {
      expect(applyCrossSlope(5, 0)).toBe(0);
      expect(applyCrossSlope(Number.NaN, 2)).toBe(0);
      expect(applyCrossSlope(3, Number.NaN)).toBe(0);
    });
  });

  describe("mergeCrossSectionZ", () => {
    it("merges centerlineZ + templateElevation + cross-slope delta when slopePercent is provided", () => {
      const centerlineZ = 100;
      const templateElevation = 1.5;
      const offset = 3;
      const slopePercent = 2;
      const expected =
        centerlineZ + templateElevation + applyCrossSlope(offset, slopePercent);

      expect(mergeCrossSectionZ(centerlineZ, offset, templateElevation, slopePercent)).toBeCloseTo(
        expected,
        9,
      );
      expect(mergeCrossSectionZ(centerlineZ, offset, templateElevation, slopePercent)).toBeCloseTo(
        101.44,
        9,
      );
    });

    it("merges centerlineZ + templateElevation only when slopePercent is omitted", () => {
      expect(mergeCrossSectionZ(100, 3, 1.5)).toBeCloseTo(101.5, 9);
      expect(mergeCrossSectionZ(100, -5, 0.2)).toBeCloseTo(100.2, 9);
    });

    it("applies inverted superelevation through mergeCrossSectionZ", () => {
      const centerlineZ = 50;
      const templateElevation = 0;

      expect(
        mergeCrossSectionZ(centerlineZ, 3, templateElevation, -2),
      ).toBeCloseTo(centerlineZ + applyCrossSlope(3, -2), 9);
      expect(
        mergeCrossSectionZ(centerlineZ, -3, templateElevation, -2),
      ).toBeCloseTo(centerlineZ + applyCrossSlope(-3, -2), 9);
    });
  });

  describe("cross section sampling", () => {
    const template = goldenTemplate();
    const gridDefinition = goldenGridDefinition(0, 50);

    it("samples display, dxf, and frame profiles at Decision #9 intervals including endpoint", () => {
      const displaySamples = sampleCrossSectionDisplay(template, gridDefinition);
      const dxfSamples = sampleCrossSectionDxf(template, gridDefinition);
      const frameSamples = sampleCrossSectionFrame(template, gridDefinition);

      expectSampleStations(displaySamples, 0, 50, SAMPLING_INTERVAL_DISPLAY);
      expectSampleStations(dxfSamples, 0, 50, SAMPLING_INTERVAL_DXF);
      expectSampleStations(frameSamples, 0, 50, SAMPLING_INTERVAL_FRAME);

      expect(displaySamples).toHaveLength(101);
      expect(dxfSamples).toHaveLength(501);
      expect(frameSamples).toHaveLength(201);
    });

    it("propagates template and offset line metadata on every sample", () => {
      const samples = sampleCrossSectionDisplay(template, gridDefinition);

      for (const sample of samples) {
        expect(sample.templateId).toBe(template.id);
        expect(sample.offsetLineIds).toEqual(template.offsetLines.map((line) => line.id));
      }
    });

    it("respects gridDefinition.offsetLineIds when provided", () => {
      const customGrid: GridDefinitionDraft = {
        ...gridDefinition,
        offsetLineIds: ["offset-left", "offset-right"],
      };
      const samples = sampleCrossSectionDisplay(template, customGrid);

      expect(samples[0]?.offsetLineIds).toEqual(["offset-left", "offset-right"]);
    });
  });

  it("uses Decision #9 sampling intervals", () => {
    expect(SAMPLING_INTERVAL_DISPLAY).toBe(0.5);
    expect(SAMPLING_INTERVAL_DXF).toBe(0.1);
    expect(SAMPLING_INTERVAL_FRAME).toBe(0.25);
  });
});
