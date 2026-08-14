import { defineConfig } from "vite";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function copyStaticRuntime() {
  return {
    name: "copy-static-runtime",
    closeBundle() {
      const outputDirectory = resolve(process.cwd(), "dist");
      for (const source of ["src/app", "libs"]) {
        const inputDirectory = resolve(process.cwd(), source);
        if (existsSync(inputDirectory)) {
          cpSync(inputDirectory, resolve(outputDirectory, source), { recursive: true });
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [copyStaticRuntime()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
