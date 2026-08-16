import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { scan } from "./scripts/testIndex.mjs";

// SLOW: 高コスト統合E2E (bridgeProject / mountain500 / fullchain 等)。
// 通常修正時には実行しない。FULL で必ず実行される。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    testTimeout: 300000,
    include: scan().slow,
  },
});
