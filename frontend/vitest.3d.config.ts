import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { scan } from "./scripts/testIndex.mjs";

// 3D: Three.js / Canvas / WebGL / 3D Viewer 系テスト。
// 環境は各ファイルの @vitest-environment 指示に従う (既定 node)。
export default defineConfig({
  plugins: [react()],
  test: {
    testTimeout: 40000,
    include: scan().threeD,
  },
});
