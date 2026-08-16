import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { scan } from "./scripts/testIndex.mjs";

// UI: Reactコンポーネント / DOM相互作用 / jsdom必須テスト
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    testTimeout: 40000,
    include: scan().ui,
  },
});
