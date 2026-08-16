import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Electron: desktop/electron の純ロジックテスト (Electronランタイム不要・node環境)
export default defineConfig({
  plugins: [react()],
  test: {
    root: "..",
    environment: "node",
    testTimeout: 40000,
    include: ["desktop/electron/**/*.test.ts"],
    exclude: ["frontend/**", "node_modules/**", "dist/**"],
  },
});
