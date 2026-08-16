/**
 * testIndex.mjs — テスト分類 (FAST / UI / 3D / SLOW) の単一 source of truth。
 *
 * 分類ルール (優先順位: SLOW > 3D > UI > FAST):
 * - SLOW: 重い統合E2E (bridgeProject / mountain500 / fullchain 等。
 *   1テスト6〜12秒超の高コスト計算を毎回実行すべきでないもの)
 * - 3D:   Three.js / Canvas / WebGL / 3D Viewer 系テスト
 * - UI:   ファイル内に `@vitest-environment jsdom` を持つテスト (React/DOM/UIロジック)
 * - FAST: 残り全て (純関数・utility・domain logic・store等の軽量テスト)
 *
 * 本分類は vitest.fast/ui/3d/slow.config.ts から利用される。
 * 全件 (FULL) は vitest.config.ts (include src 全体) が実行し、
 * 全テストが必ずいずれかのGateで実行されることを保証する。
 *
 * 使い方:
 *   import { scan } from "../scripts/testIndex.mjs";
 *   const { fast, ui, threeD, slow } = scan();
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC_DIR = join(FRONTEND_DIR, "src");

const THREE_D_PATTERNS = [
  /^src\/viewer\/Viewer3D.*\.test\.tsx$/,
  /^src\/viewer\/threeUtils.*\.test\.ts$/,
  /^src\/viewer\/SceneBuilder\.apolloVisualization\.test\.ts$/,
  /^src\/viewer\/layers\/__tests__\/buildLayerScene.*\.test\.ts$/,
  /^src\/viewer\/unified\/__tests__\/.*\.test\.tsx$/,
  /^src\/substructure\/__tests__\/threeFactory\.test\.ts$/,
  /^src\/substructure\/__tests__\/substructureViewer3D\.test\.tsx$/,
  /^src\/apollo\/__tests__\/(bridgeStructureVisualization|continuousGirderVisualization|visualizationBuilder|visualizationBoundsBracing)\.test\.ts$/,
  /^src\/apollo\/visualization\/.*\.test\.ts$/,
  /^src\/next\/modules\/__tests__\/(existingViewerBuilder|integratedSceneBuilder|referenceMountainScene)\.test\.ts$/,
  /^src\/next\/modules\/cim\/__tests__\/(cimIntegratedScene|integrated3dScene)\.test\.ts$/,
  /^src\/next\/modules\/bridgeLayout\/__tests__\/bridgeLayoutScene\.test\.ts$/,
  /^src\/next\/modules\/terrain\/__tests__\/terrainViewerBuilder\.test\.ts$/,
  /^src\/next\/modules\/road\/__tests__\/(road3dCamera|roadMesh)\.test\.ts$/,
  /^src\/next\/modules\/superstructure\/__tests__\/superstructureSceneBuilder\.test\.ts$/,
  /^src\/liner\/samples\/__tests__\/(mountainScene|mountainViewerSwitch|mountainCamera|terrainFix)\.test\.ts$/,
  /^src\/bridgeProject\/__tests__\/integratedScene3d\.test\.ts$/,
];

const SLOW_PATTERNS = [/^src\/bridgeProject\/__tests__\//];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

export function scan() {
  const fast = [];
  const ui = [];
  const threeD = [];
  const slow = [];
  for (const file of walk(SRC_DIR)) {
    const rel = relative(FRONTEND_DIR, file).replace(/\\/g, "/");
    const content = readFileSync(file, "utf8");
    if (SLOW_PATTERNS.some((re) => re.test(rel))) slow.push(rel);
    else if (THREE_D_PATTERNS.some((re) => re.test(rel))) threeD.push(rel);
    else if (content.includes("@vitest-environment jsdom")) ui.push(rel);
    else fast.push(rel);
  }
  return { fast, ui, threeD, slow };
}
