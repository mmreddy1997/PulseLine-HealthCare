import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.PAGES_BASE || "/",
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["@mlc-ai/web-llm"],
  },
});
