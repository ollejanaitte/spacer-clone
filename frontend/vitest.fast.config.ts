import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { scan } from "./scripts/testIndex.mjs";

// FAST: 純関数・utility・domain logic・store等の軽量テスト (jsdom不要)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    testTimeout: 40000,
    include: scan().fast,
    // phase10Sb は P10_SB_OUTPUT 必須のoracle照合専用 (vitest.sb.config.ts) で、
    // 通常Gate (FAST/UI/3D/SLOW/FULL) からは除外する。
    exclude: ["src/next/modules/substructure/__tests__/phase10SbQuantityDerivation.test.ts"],
  },
});
