import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// E2E 専用ポートで backend を分離するための proxy 先。
// 既定は開発用 `http://127.0.0.1:8000`。Playwright E2E では
// `SPACER_BACKEND_ORIGIN` で E2E 専用 backend を指す。
const backendOrigin = process.env.SPACER_BACKEND_ORIGIN ?? "http://127.0.0.1:8000";

export default defineConfig(({ mode }) => ({
  base: "./",
  define: {
    __APOLLO_PHASE1_MODE__: JSON.stringify(mode === "apollo"),
  },
  resolve: {
    alias: {
      "node:crypto": fileURLToPath(new URL("./src/polyfills/nodeCrypto.ts", import.meta.url)),
    },
  },
  plugins: [
    react(),
    {
      name: "time-history-legacy-route-redirect",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url?.split("?")[0] === "/th/output-targets") {
            response.statusCode = 301;
            response.setHeader("Location", "/th/run");
            response.end();
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": backendOrigin,
      "/health": backendOrigin,
    },
  },
}));
