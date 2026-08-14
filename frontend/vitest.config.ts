import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    testTimeout: 40000,
    exclude: [
      "tests/e2e/**",
      "tests/e2e-p904r3/**",
      "node_modules/**",
      "dist/**",
      "src/bridgeDefinition/__tests__/regression.golden.test.ts",
      "src/next/modules/substructure/__tests__/phase10SbQuantityDerivation.test.ts",
    ],
  },
});
