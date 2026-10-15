import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    // Les tests partagent une base MongoDB : on les exécute l'un après l'autre.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
