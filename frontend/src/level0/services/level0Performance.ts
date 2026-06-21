/**
 * パフォーマンス計測ユーティリティ
 * 設計書 §18 の目標値を計測する
 */

export type PerformanceMetrics = {
  homeRenderMs: number;
  templateLoadMs: number;
  analysisStartMs: number;
  animationFps: number;
  resultCardMs: number;
};

const metrics: PerformanceMetrics = {
  homeRenderMs: 0,
  templateLoadMs: 0,
  analysisStartMs: 0,
  animationFps: 0,
  resultCardMs: 0,
};

export function measureHomeRender(startTime: number): void {
  metrics.homeRenderMs = performance.now() - startTime;
}

export function measureTemplateLoad(startTime: number): void {
  metrics.templateLoadMs = performance.now() - startTime;
}

export function measureAnalysisStart(startTime: number): void {
  metrics.analysisStartMs = performance.now() - startTime;
}

export function measureAnimationFps(fps: number): void {
  metrics.animationFps = fps;
}

export function measureResultCard(startTime: number): void {
  metrics.resultCardMs = performance.now() - startTime;
}

export function getMetrics(): PerformanceMetrics {
  return { ...metrics };
}

export function logMetrics(): void {
  const m = getMetrics();
  console.info("[Level0 Performance]");
  console.info(`  Home render: ${m.homeRenderMs.toFixed(1)}ms (target: <2000ms)`);
  console.info(`  Template load: ${m.templateLoadMs.toFixed(1)}ms (target: <3000ms)`);
  console.info(`  Analysis start: ${m.analysisStartMs.toFixed(1)}ms (target: <1000ms)`);
  console.info(`  Animation FPS: ${m.animationFps.toFixed(1)} (target: >30fps)`);
  console.info(`  Result card: ${m.resultCardMs.toFixed(1)}ms (target: <1000ms)`);
}

export function checkTargets(): { passed: boolean; details: string[] } {
  const m = getMetrics();
  const details: string[] = [];
  let passed = true;

  if (m.homeRenderMs > 2000) { details.push(`Home render: ${m.homeRenderMs.toFixed(1)}ms > 2000ms`); passed = false; }
  if (m.templateLoadMs > 3000) { details.push(`Template load: ${m.templateLoadMs.toFixed(1)}ms > 3000ms`); passed = false; }
  if (m.analysisStartMs > 1000) { details.push(`Analysis start: ${m.analysisStartMs.toFixed(1)}ms > 1000ms`); passed = false; }
  if (m.animationFps < 30 && m.animationFps > 0) { details.push(`Animation FPS: ${m.animationFps.toFixed(1)} < 30fps`); passed = false; }
  if (m.resultCardMs > 1000) { details.push(`Result card: ${m.resultCardMs.toFixed(1)}ms > 1000ms`); passed = false; }

  return { passed, details };
}
