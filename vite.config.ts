import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    root: "./",
    base: mode == "deploy" ? "/childrenGame/" : "./",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@styles": path.resolve(__dirname, "./src/styles"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@store": path.resolve(__dirname, "./src/store"),
        "@types": path.resolve(__dirname, "./src/types"),
        "@config": path.resolve(__dirname, "./src/config"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@styles/variables" as *; @use "@styles/mixins" as *;`,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
              return "react-vendor";
            }
            if (id.includes("antd")) {
              return "antd-vendor";
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
