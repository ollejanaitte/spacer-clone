import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import type { Project } from "./model";
import { defaultProject } from "./defaultProject";
import { buildScene, disposeScene, type SceneGraph } from "./geometry";
import { computeProjectQuantity } from "./quantity";
import { parseProject, serializeProject, download, readFile } from "./projectIO";
import { validateProject } from "./validation";

const formEl = document.getElementById("form")!;
const statusEl = document.getElementById("status")!;
const infoEl = document.getElementById("info")!;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;

let project: Project = defaultProject();
let scene: SceneGraph | null = null;

const container = document.getElementById("viewport") as HTMLElement;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const scene3 = new THREE.Scene();
scene3.background = new THREE.Color(0x111a11);
scene3.add(new THREE.AmbientLight(0xffffff, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(20, 30, 40);
scene3.add(dir);

const camera3 = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
camera3.position.set(18, 12, 18);
const controls = new OrbitControls(camera3, renderer.domElement);
controls.enableDamping = true;

let quantityText = "";

function updateQuantity() {
  const q = computeProjectQuantity(project.supports);
  quantityText =
    `柱体積: ${q.columnVolume.toFixed(2)} m3\n` +
    `梁体積: ${q.capVolume.toFixed(2)} m3\n` +
    `フーチング体積: ${q.footingVolume.toFixed(2)} m3\n` +
    `杭体積: ${q.pileVolume.toFixed(2)} m3\n` +
    `合計コンクリート体積: ${q.totalConcreteVolume.toFixed(2)} m3\n` +
    `杭総延長: ${q.totalPileLength.toFixed(2)} m`;
}

function updateStatusUI() {
  const issues = validateProject(project);
  if (issues.length) {
    statusEl.innerHTML =
      `<span class="err">入力エラー（fail-closed）:</span>\n` +
      issues.map((i) => `${i.path}: ${i.message}`).join("\n");
  } else {
    statusEl.innerHTML =
      `<span class="ok">入力済み / 3D生成可能</span>\n${quantityText}\n` +
      `<span class="warn">反力依存機能: 利用不可（反力なし）</span>\n` +
      `（概算値・未検証・実務使用不可）`;
  }
}

function regenerate() {
  if (scene) {
    scene3.remove(scene.root);
    disposeScene(scene);
  }
  scene = buildScene(project);
  scene3.add(scene.root);
  updateQuantity();
  updateStatusUI();
  render();
}

function render() {
  renderer.render(scene3, camera3);
}
function animate() {
  controls.update();
  render();
  requestAnimationFrame(animate);
}

// 部材選択
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener("click", (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera3);
  raycaster.layers.set(0);
  const hits = raycaster.intersectObjects(scene?.root.children ?? [], true);
  if (hits.length > 0) {
    infoEl.textContent = `選択部材ID: ${hits[0].object.name || "(無名)"}`;
  }
});

// フォーム
const fieldDefs: Array<{ key: string; label: string; get: (p: Project) => number | string; set: (p: Project, v: number) => void }> = [
  { key: "projName", label: "プロジェクト名", get: (p) => p.name, set: () => {} },
  { key: "colWidth", label: "柱幅(橋軸直角) m", get: (p) => p.supports[0].pier?.column.width ?? 0, set: (p, v) => { if (p.supports[0].pier) p.supports[0].pier.column.width = v; } },
  { key: "colDepth", label: "柱奥行(橋軸) m", get: (p) => p.supports[0].pier?.column.depth ?? 0, set: (p, v) => { if (p.supports[0].pier) p.supports[0].pier.column.depth = v; } },
  { key: "colHeight", label: "柱高 m", get: (p) => p.supports[0].pier?.column.height ?? 0, set: (p, v) => { if (p.supports[0].pier) p.supports[0].pier.column.height = v; } },
  { key: "capWidth", label: "梁幅(橋軸) m", get: (p) => p.supports[0].pier?.cap.width ?? 0, set: (p, v) => { if (p.supports[0].pier) p.supports[0].pier.cap.width = v; } },
  { key: "capHeight", label: "梁高 m", get: (p) => p.supports[0].pier?.cap.height ?? 0, set: (p, v) => { if (p.supports[0].pier) p.supports[0].pier.cap.height = v; } },
  { key: "capDepth", label: "梁奥行(橋軸直角) m", get: (p) => p.supports[0].pier?.cap.depth ?? 0, set: (p, v) => { if (p.supports[0].pier) p.supports[0].pier.cap.depth = v; } },
  { key: "footWidth", label: "フーチング幅(橋軸直角) m", get: (p) => p.supports[0].pier?.footing.width ?? 0, set: (p, v) => { if (p.supports[0].pier) p.supports[0].pier.footing.width = v; } },
  { key: "footLength", label: "フーチング長(橋軸) m", get: (p) => p.supports[0].pier?.footing.length ?? 0, set: (p, v) => { if (p.supports[0].pier) p.supports[0].pier.footing.length = v; } },
  { key: "footThick", label: "フーチング厚 m", get: (p) => p.supports[0].pier?.footing.thickness ?? 0, set: (p, v) => { if (p.supports[0].pier) p.supports[0].pier.footing.thickness = v; } },
  { key: "pileDia", label: "杭径 m", get: (p) => p.supports[0].pier?.piles?.diameter ?? 0, set: (p, v) => { if (p.supports[0].pier?.piles) p.supports[0].pier.piles.diameter = v; } },
  { key: "pileLen", label: "杭長 m", get: (p) => p.supports[0].pier?.piles?.length ?? 0, set: (p, v) => { if (p.supports[0].pier?.piles) p.supports[0].pier.piles.length = v; } },
  { key: "pileCount", label: "杭本数", get: (p) => p.supports[0].pier?.piles?.pileCount ?? 0, set: (p, v) => { if (p.supports[0].pier?.piles) p.supports[0].pier.piles.pileCount = Math.round(v); } },
  { key: "pileSx", label: "杭間隔(橋軸) m", get: (p) => p.supports[0].pier?.piles?.spacing.x ?? 0, set: (p, v) => { if (p.supports[0].pier?.piles) p.supports[0].pier.piles.spacing.x = v; } },
  { key: "pileSy", label: "杭間隔(直角) m", get: (p) => p.supports[0].pier?.piles?.spacing.y ?? 0, set: (p, v) => { if (p.supports[0].pier?.piles) p.supports[0].pier.piles.spacing.y = v; } },
  { key: "skew", label: "斜角 deg", get: (p) => p.supports[0]?.skewAngle ?? 0, set: (p, v) => { p.supports.forEach((s) => (s.skewAngle = v)); } },
];

function buildForm() {
  formEl.innerHTML = "";
  for (const f of fieldDefs) {
    const row = document.createElement("label");
    row.textContent = f.label;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.1";
    if (f.key === "projName") {
      input.type = "text";
      input.value = String(f.get(project));
    } else {
      input.value = String(f.get(project));
    }
    input.addEventListener("input", () => {
      if (f.key === "projName") {
        project.name = input.value;
        return;
      }
      const n = Number(input.value);
      if (Number.isFinite(n)) {
        f.set(project, n);
        regenerate();
      }
    });
    row.appendChild(input);
    formEl.appendChild(row);
  }
}

document.getElementById("btnNew")?.addEventListener("click", () => {
  project = defaultProject();
  buildForm();
  regenerate();
});

document.getElementById("btnSave")?.addEventListener("click", () => {
  download("substructure-project.json", serializeProject(project));
});

document.getElementById("btnLoad")?.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const text = await readFile(f);
  try {
    project = parseProject(text);
    buildForm();
    regenerate();
    statusEl.innerHTML = `<span class="ok">読込成功</span>`;
  } catch (err) {
    statusEl.innerHTML = `<span class="err">読込失敗: ${err instanceof Error ? err.message : "不明"}</span>`;
  }
});

document.getElementById("btnGlb")?.addEventListener("click", () => {
  if (!scene) return;
  const exporter = new GLTFExporter();
  exporter.parse(
    scene.root,
    (gltf) => {
      download("substructure.glb", gltf as unknown as string, "application/octet-stream");
    },
    (err) => {
      statusEl.innerHTML = `<span class="err">GLB出力エラー: ${String(err)}</span>`;
    },
    { binary: true }
  );
});

window.addEventListener("resize", () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera3.aspect = w / h;
  camera3.updateProjectionMatrix();
});

buildForm();
regenerate();
animate();
