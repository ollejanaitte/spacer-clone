import type { AnalysisResult, ProjectModel } from "../types";

export type VerificationMetric = {
  model: string;
  category: string;
  indicator: string;
  expected: number;
  actual: number;
  difference: number;
  errorRate: number;
  passed: boolean;
};

export type VerificationReport = {
  generatedAt: string;
  models: Array<{
    name: string;
    category: string;
    passed: boolean;
    metrics: VerificationMetric[];
  }>;
  summary: {
    totalModels: number;
    passedModels: number;
    failedModels: number;
    totalMetrics: number;
    passedMetrics: number;
    failedMetrics: number;
  };
};

export type VerificationMetadata = {
  name: string;
  category: string;
  description: string;
  modelPath: string;
  expected: Record<string, unknown>;
  tolerance: {
    relative: number;
    absolute: number;
  };
  parameters?: Record<string, unknown>;
  theoryFormulas?: Record<string, string>;
};

function findNestedValue(obj: Record<string, unknown>, path: string): number | null {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    if (typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return typeof current === "number" ? current : null;
}

export function evaluateMetric(
  expected: number | null,
  actual: number | null,
  tolerance: { relative: number; absolute: number },
): VerificationMetric | null {
  if (expected === null || actual === null) return null;
  const difference = actual - expected;
  const absExpected = Math.abs(expected);
  const errorRate = absExpected > tolerance.absolute
    ? Math.abs(difference) / absExpected
    : Math.abs(difference);
  const passed = errorRate <= tolerance.relative || Math.abs(difference) <= tolerance.absolute;
  return {
    model: "",
    category: "",
    indicator: "",
    expected,
    actual,
    difference,
    errorRate,
    passed,
  };
}

export function extractDisplacementMetrics(
  result: AnalysisResult,
  expected: Record<string, Record<string, number>>,
  tolerance: { relative: number; absolute: number },
): VerificationMetric[] {
  const metrics: VerificationMetric[] = [];
  for (const [nodeId, components] of Object.entries(expected)) {
    for (const [component, expectedValue] of Object.entries(components)) {
      const displacement = result.displacements.find((d) => d.nodeId === nodeId);
      const actualValue = displacement ? (displacement as unknown as Record<string, number>)[component] ?? null : null;
      const metric = evaluateMetric(expectedValue, actualValue, tolerance);
      if (metric) {
        metric.indicator = `displacement.${nodeId}.${component}`;
        metrics.push(metric);
      }
    }
  }
  return metrics;
}

export function extractReactionMetrics(
  result: AnalysisResult,
  expected: Record<string, Record<string, number>>,
  tolerance: { relative: number; absolute: number },
): VerificationMetric[] {
  const metrics: VerificationMetric[] = [];
  for (const [nodeId, components] of Object.entries(expected)) {
    for (const [component, expectedValue] of Object.entries(components)) {
      const reaction = result.reactions.find((r) => r.nodeId === nodeId);
      const actualValue = reaction ? (reaction as unknown as Record<string, number>)[component] ?? null : null;
      const metric = evaluateMetric(expectedValue, actualValue, tolerance);
      if (metric) {
        metric.indicator = `reaction.${nodeId}.${component}`;
        metrics.push(metric);
      }
    }
  }
  return metrics;
}

export function extractMemberForceMetrics(
  result: AnalysisResult,
  expected: Record<string, unknown>,
  tolerance: { relative: number; absolute: number },
): VerificationMetric[] {
  const metrics: VerificationMetric[] = [];
  if (!expected.maxAbsMemberForce) return metrics;

  const maxForces = expected.maxAbsMemberForce as Record<string, number>;
  for (const [component, expectedValue] of Object.entries(maxForces)) {
    const componentKey = component.toLowerCase();
    let maxAbs = 0;
    for (const force of result.memberEndForces) {
      for (const end of ["i", "j"] as const) {
        const val = Math.abs((force[end] as Record<string, number>)[componentKey] ?? 0);
        if (val > maxAbs) maxAbs = val;
      }
    }
    const metric = evaluateMetric(expectedValue, maxAbs, tolerance);
    if (metric) {
      metric.indicator = `memberForce.maxAbs.${component}`;
      metrics.push(metric);
    }
  }
  return metrics;
}

export function generateVerificationReport(
  modelName: string,
  category: string,
  result: AnalysisResult,
  metadata: VerificationMetadata,
): { name: string; category: string; passed: boolean; metrics: VerificationMetric[] } {
  const tolerance = metadata.tolerance;
  const expected = metadata.expected as Record<string, unknown>;

  const metrics: VerificationMetric[] = [];

  if (expected.displacements && typeof expected.displacements === "object") {
    metrics.push(
      ...extractDisplacementMetrics(
        result,
        expected.displacements as Record<string, Record<string, number>>,
        tolerance,
      ),
    );
  }

  if (expected.reactions && typeof expected.reactions === "object") {
    metrics.push(
      ...extractReactionMetrics(
        result,
        expected.reactions as Record<string, Record<string, number>>,
        tolerance,
      ),
    );
  }

  if (expected.maxAbsMemberForce && typeof expected.maxAbsMemberForce === "object") {
    metrics.push(
      ...extractMemberForceMetrics(result, expected, tolerance),
    );
  }

  for (const metric of metrics) {
    metric.model = modelName;
    metric.category = category;
  }

  const passed = metrics.every((m) => m.passed);
  return { name: modelName, category, passed, metrics };
}

export function buildVerificationReportCsv(report: VerificationReport): string {
  const headers = [
    "model",
    "category",
    "indicator",
    "expected",
    "actual",
    "difference",
    "error_rate",
    "passed",
  ];

  const rows: string[] = [];
  for (const model of report.models) {
    for (const metric of model.metrics) {
      rows.push([
        metric.model,
        metric.category,
        metric.indicator,
        metric.expected.toExponential(6),
        metric.actual.toExponential(6),
        metric.difference.toExponential(6),
        metric.errorRate.toExponential(6),
        String(metric.passed),
      ].join(","));
    }
  }

  return [headers.join(","), ...rows].join("\r\n") + "\r\n";
}

export function buildVerificationSummaryCsv(report: VerificationReport): string {
  const headers = [
    "model",
    "category",
    "passed",
    "total_metrics",
    "passed_metrics",
    "failed_metrics",
  ];

  const rows = report.models.map((model) => {
    const passedMetrics = model.metrics.filter((m) => m.passed).length;
    const failedMetrics = model.metrics.length - passedMetrics;
    return [
      model.name,
      model.category,
      String(model.passed),
      String(model.metrics.length),
      String(passedMetrics),
      String(failedMetrics),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n") + "\r\n";
}
