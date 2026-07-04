import { useCallback, useMemo, useRef, useState } from "react";
import type {
  AngleValue,
  Flags,
  NullableNumberValue,
  Point,
  Section,
  SourceRef,
  StationingRef,
} from "../types";
import {
  createSourceRef,
  parseAngleNotation,
  parseNumericInput,
  sortSectionsByPdfPage,
} from "../utils/importerUtils";

const MAX_UNDO_STEPS = 50;

export type EditableField =
  | "x"
  | "y"
  | "designElevation"
  | "crossSlope"
  | "unitDistance"
  | "cumulativeDistance"
  | "unitWidth"
  | "cumulativeWidth"
  | "station"
  | "azimuth"
  | "stationLabel"
  | "stationValue";

export type CellAddress = {
  pointId?: string;
  field: EditableField;
};

type HistoryEntry = {
  section: Section;
};

function cloneSection(section: Section): Section {
  return structuredClone(section);
}

function updatePointField(
  section: Section,
  pointId: string,
  field: keyof Point,
  value: unknown,
): Section {
  return {
    ...section,
    points: section.points.map((point) =>
      point.id === pointId ? { ...point, [field]: value } : point,
    ),
  };
}

function applyCellText(
  section: Section,
  address: CellAddress,
  text: string,
  pdfPage: number,
): Section {
  const trimmed = text.trim();
  const now = new Date().toISOString();

  if (address.field === "azimuth") {
    if (trimmed.includes("*")) {
      const next: AngleValue = {
        value: null,
        flags: { notComputed: true },
        sourceRef: { ...section.azimuth.sourceRef, enteredAt: now, pdfPage },
      };
      return { ...section, azimuth: next };
    }
    const angle = parseAngleNotation(trimmed);
    if (!angle) {
      return section;
    }
    return {
      ...section,
      azimuth: {
        value: angle,
        flags: {},
        sourceRef: { ...section.azimuth.sourceRef, enteredAt: now, pdfPage },
      },
    };
  }

  if (address.field === "stationLabel") {
    return {
      ...section,
      stationingRef: {
        ...section.stationingRef,
        stationLabel: trimmed || null,
        sourceRef: {
          ...(section.stationingRef.sourceRef ?? createSourceRef(pdfPage)),
          enteredAt: now,
          pdfPage,
        },
      },
    };
  }

  if (address.field === "stationValue") {
    const parsed = parseNumericInput(trimmed);
    return {
      ...section,
      stationingRef: {
        ...section.stationingRef,
        stationValue: parsed?.value ?? (trimmed.length === 0 ? null : section.stationingRef.stationValue),
        notation: parsed?.notation ?? section.stationingRef.notation,
        sourceRef: {
          ...(section.stationingRef.sourceRef ?? createSourceRef(pdfPage)),
          enteredAt: now,
          pdfPage,
        },
      },
    };
  }

  if (!address.pointId) {
    return section;
  }

  const point = section.points.find((entry) => entry.id === address.pointId);
  if (!point) {
    return section;
  }

  if (address.field === "station") {
    const parsed = parseNumericInput(trimmed);
    const stationValue = point.station ?? {
      value: null,
      label: null,
      notation: null,
      flags: {},
      sourceRef: createSourceRef(pdfPage),
    };
    return updatePointField(section, address.pointId, "station", {
      ...stationValue,
      value: parsed?.value ?? (trimmed.includes("*") ? null : stationValue.value),
      notation: parsed?.notation ?? (trimmed.includes("*") ? trimmed : stationValue.notation),
      flags: trimmed.includes("*") ? { notComputed: true } : {},
      sourceRef: { ...stationValue.sourceRef, enteredAt: now, pdfPage },
    });
  }

  const numericFields: Array<keyof Point> = [
    "x",
    "y",
    "designElevation",
    "crossSlope",
    "unitDistance",
    "cumulativeDistance",
    "unitWidth",
    "cumulativeWidth",
  ];

  if (!numericFields.includes(address.field as keyof Point)) {
    return section;
  }

  const field = address.field as keyof Point;
  const current = point[field] as NullableNumberValue;
  const parsed = parseNumericInput(trimmed);
  const nextValue: NullableNumberValue = parsed
    ? {
        ...current,
        value: parsed.value,
        notation: parsed.notation,
        flags: parsed.flags,
        sourceRef: { ...current.sourceRef, enteredAt: now, pdfPage, field: address.field },
      }
    : trimmed.length === 0
      ? { ...current, value: null, notation: null, flags: {}, sourceRef: { ...current.sourceRef, enteredAt: now, pdfPage } }
      : current;

  return updatePointField(section, address.pointId, field, nextValue);
}

export function useSectionEditor(initialSection: Section, allSections: Section[]) {
  const [draft, setDraft] = useState<Section>(() => cloneSection(initialSection));
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const [focusCell, setFocusCell] = useState<CellAddress>({ field: "azimuth" });

  const orderedSections = useMemo(() => sortSectionsByPdfPage(allSections), [allSections]);
  const currentIndex = orderedSections.findIndex((section) => section.id === draft.id);

  const resetDraft = useCallback((section: Section) => {
    setDraft(cloneSection(section));
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  const pushHistory = useCallback((previous: Section) => {
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO_STEPS - 1)), { section: cloneSection(previous) }];
    redoStack.current = [];
  }, []);

  const updateDraft = useCallback(
    (updater: (section: Section) => Section) => {
      setDraft((current) => {
        const next = updater(current);
        if (next !== current) {
          pushHistory(current);
        }
        return next;
      });
    },
    [pushHistory],
  );

  const setCellText = useCallback(
    (address: CellAddress, text: string) => {
      updateDraft((section) => applyCellText(section, address, text, section.pdfPage));
    },
    [updateDraft],
  );

  const updateFlags = useCallback(
    (pointId: string, field: keyof Point, flags: Flags) => {
      updateDraft((section) => {
        const point = section.points.find((entry) => entry.id === pointId);
        if (!point) {
          return section;
        }
        const cell = point[field];
        if (typeof cell !== "object" || cell == null || !("flags" in cell)) {
          return section;
        }
        return updatePointField(section, pointId, field, { ...cell, flags });
      });
    },
    [updateDraft],
  );

  const updateSourceRef = useCallback(
    (pointId: string | undefined, field: string, sourceRef: Partial<SourceRef>) => {
      updateDraft((section) => {
        if (!pointId) {
          if (field === "azimuth") {
            return {
              ...section,
              azimuth: {
                ...section.azimuth,
                sourceRef: { ...section.azimuth.sourceRef, ...sourceRef },
              },
            };
          }
          if (field === "stationingRef") {
            const base = section.stationingRef.sourceRef ?? createSourceRef(section.pdfPage);
            return {
              ...section,
              stationingRef: {
                ...section.stationingRef,
                sourceRef: { ...base, ...sourceRef },
              },
            };
          }
          return section;
        }

        const point = section.points.find((entry) => entry.id === pointId);
        if (!point) {
          return section;
        }
        const cell = point[field as keyof Point];
        if (typeof cell !== "object" || cell == null || !("sourceRef" in cell)) {
          return {
            ...section,
            sourceRef: { ...section.sourceRef, ...sourceRef },
          };
        }
        return updatePointField(section, pointId, field as keyof Point, {
          ...cell,
          sourceRef: { ...(cell as { sourceRef: SourceRef }).sourceRef, ...sourceRef },
        });
      });
    },
    [updateDraft],
  );

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) {
      return;
    }
    setDraft((current) => {
      redoStack.current = [...redoStack.current, { section: cloneSection(current) }];
      return cloneSection(entry.section);
    });
  }, []);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) {
      return;
    }
    setDraft((current) => {
      undoStack.current = [...undoStack.current, { section: cloneSection(current) }];
      return cloneSection(entry.section);
    });
  }, []);

  const navigateSection = useCallback(
    (direction: "prev" | "next") => {
      if (currentIndex < 0) {
        return null;
      }
      const targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
      const target = orderedSections[targetIndex];
      return target ?? null;
    },
    [currentIndex, orderedSections],
  );

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return {
    draft,
    focusCell,
    setFocusCell,
    resetDraft,
    setCellText,
    updateFlags,
    updateSourceRef,
    undo,
    redo,
    canUndo,
    canRedo,
    navigateSection,
    orderedSections,
    currentIndex,
  };
}

export function formatNullableDisplay(value: NullableNumberValue | undefined): string {
  if (!value) {
    return "";
  }
  if (value.notation) {
    return value.notation;
  }
  if (value.value != null) {
    return String(value.value);
  }
  return "";
}

export function formatStationingRef(ref: StationingRef): { label: string; value: string } {
  return {
    label: ref.stationLabel ?? "",
    value: ref.stationValue != null ? String(ref.stationValue) : ref.notation ?? "",
  };
}
