import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    testTimeout: 15000,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],

    // 👇 asegura ejecución en serie
    sequence: {
      concurrent: false,
    },

    // 👇 MUY recomendado con Prisma
    pool: "forks",
  },
})