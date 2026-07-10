import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    testTimeout: 40000,
    exclude: [
      "tests/e2e/**",
      "node_modules/**",
      "dist/**",
      "src/bridgeDefinition/__tests__/regression.golden.test.ts",
    ],
  },
});
