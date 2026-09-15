import { defineConfig } from "vitest/config";
import path from "node:path";

// Testes de integração rodam contra um Supabase local de verdade
// (`npx supabase start`). Não fazem parte de `npm test` porque dependem do
// Docker estar rodando; use `npm run test:integration`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/**/*.integration.test.ts"],
    setupFiles: ["src/test/env-setup.ts"],
    testTimeout: 20000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
