import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    testTimeout: 40000,
    include: ["src/next/modules/substructure/__tests__/phase10SbQuantityDerivation.test.ts"],
  },
});
