import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function bundleBudgetPlugin() {
  let rootDir = process.cwd();
  let report = [];

  return {
    name: "bundle-budget-report",
    apply: "build",
    configResolved(config) {
      rootDir = config.root;
    },
    generateBundle(_options, bundle) {
      report = Object.values(bundle)
        .filter((item) => item.type === "chunk")
        .map((item) => ({
          fileName: item.fileName,
          isEntry: item.isEntry,
          imports: item.imports.length,
          sizeKb: Number((Buffer.byteLength(item.code, "utf8") / 1024).toFixed(2))
        }))
        .sort((left, right) => right.sizeKb - left.sizeKb);

      for (const chunk of report) {
        const budgetKb = chunk.isEntry ? 250 : 400;
        if (chunk.sizeKb > budgetKb) {
          this.warn(`${chunk.fileName} is ${chunk.sizeKb} kB which exceeds the ${budgetKb} kB budget.`);
        }
      }
    },
    closeBundle() {
      const outputPath = path.join(rootDir, "dist", "bundle-report.json");
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    }
  };
}

export default defineConfig({
  plugins: [react(), bundleBudgetPlugin()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("konva")) {
            return "canvas-vendor";
          }
          if (id.includes("/react/") || id.includes("react-dom")) {
            return "react-vendor";
          }
          return "vendor";
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    globals: true,
    include: ["src/**/*.test.{js,jsx}"],
    exclude: ["tests/**", "node_modules/**"]
  }
});
