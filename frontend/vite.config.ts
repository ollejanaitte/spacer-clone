import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "./",
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
      "/api": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
});
