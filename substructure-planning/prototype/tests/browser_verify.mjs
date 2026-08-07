// E2Eブラウザ検証スクリプト（playwright-core）
// 使い方:
//   1) 事前に dev サーバ起動: cd substructure-planning/prototype && npx vite --host 127.0.0.1 --port 5173
//   2) CHROME_PATH を設定して実行:
//      CHROME_PATH=<chromium-binary> node tests/browser_verify.mjs
// 検証: ページ読込 → canvas表示 → 寸法変更 → JSON保存 → GLB出力 → 部材ID表示 → JSON再読込み
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPE = path.dirname(__dirname);
const REPO_ROOT = path.resolve(PROTOTYPE, "..", "..");
const SHOTS = path.join(REPO_ROOT, "substructure-planning", "verification", "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const CHROME = process.env.CHROME_PATH;
if (!CHROME || !fs.existsSync(CHROME)) {
  console.error("CHROME_PATH が未設定または存在しません。Chromium 実行可能ファイルを CHROME_PATH で指定してください。");
  process.exit(1);
}
const URL = process.env.LAB_URL || "http://127.0.0.1:5173/";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "substructure-browser-verify-"));

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? " :: " + detail : ""}`);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const canvasCount = await page.locator("canvas").count();
record("canvas 存在", canvasCount > 0, `canvas=${canvasCount}`);

const statusText = await page.locator("#status").innerText();
record("状態表示「3D生成可能」", statusText.includes("3D生成可能"), statusText.split("\n")[0]);

record("概算数量表示", /柱体積/.test(statusText), statusText.split("\n").slice(0, 2).join(" / "));

const readVolume = async () => {
  const t = await page.locator("#status").innerText();
  const m = t.match(/合計コンクリート体積: ([\d.]+)/);
  return m ? Number(m[1]) : NaN;
};
const v0 = await readVolume();
const inputs = page.locator("#form input");
const count = await inputs.count();
let colWidthInput = null;
for (let i = 0; i < count; i++) {
  const inp = inputs.nth(i);
  const label = await inp.locator("xpath=..").innerText();
  if (label.includes("柱幅")) colWidthInput = inp;
}
if (colWidthInput) {
  await colWidthInput.fill("3");
  await colWidthInput.dispatchEvent("input");
  await page.waitForTimeout(800);
}
const v1 = await readVolume();
record("寸法変更で再生成（体積変化）", Number.isFinite(v0) && Number.isFinite(v1) && Math.abs(v1 - v0) > 0.1, `v0=${v0} v1=${v1}`);

await page.waitForTimeout(300);
let gotMember = false;
let infoText = "";
for (const [px, py] of [[800, 550], [700, 650], [900, 650], [800, 750]]) {
  await page.mouse.click(px, py);
  await page.waitForTimeout(250);
  infoText = await page.locator("#info").innerText();
  if (/P1-|A1-|PILE|FOOTING|CAP|COLUMN|SEAT|BEARING/.test(infoText)) { gotMember = true; break; }
}
record("部材選択でID表示", gotMember, infoText);

await page.screenshot({ path: path.join(SHOTS, "prototype_3d_view.png") });
record("スクリーンショット保存", true, path.join(SHOTS, "prototype_3d_view.png"));

record("JSエラーなし", errors.length === 0, errors.slice(0, 3).join(" | "));

const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.click("#btnSave"),
]);
const dlPath = path.join(TMP, download.suggestedFilename());
await download.saveAs(dlPath);
const dlText = fs.readFileSync(dlPath, "utf-8");
const dlJson = JSON.parse(dlText);
record("JSON保存（schemaVersion一致）", dlJson.schemaVersion === "0.1.0", dlJson.name);

const [glbDownload] = await Promise.all([
  page.waitForEvent("download"),
  page.click("#btnGlb"),
]);
const glbPath = path.join(TMP, glbDownload.suggestedFilename());
await glbDownload.saveAs(glbPath);
const glbSize = fs.statSync(glbPath).size;
const glbHeader = fs.readFileSync(glbPath).subarray(0, 4).toString();
record("GLB出力（header=glTF, size>0）", glbHeader === "glTF" && glbSize > 0, `size=${glbSize}`);

await page.locator("#fileInput").setInputFiles(dlPath);
await page.waitForTimeout(800);
const reloadStatus = await page.locator("#status").innerText();
record("JSON再読込み", reloadStatus.includes("読込成功"), reloadStatus.split("\n")[0]);

await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });

const passed = results.filter((r) => r.ok).length;
console.log(`\n=== ブラウザ検証 ${passed}/${results.length} PASS ===`);
process.exit(passed === results.length ? 0 : 1);
