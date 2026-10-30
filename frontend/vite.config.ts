import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const config = defineConfig(() => {
  return {
    base: "/",
    server: {
      host: "127.0.0.1",
      port: 3300,
      strictPort: true,
      hmr: {
        host: "127.0.0.1",
        port: 3300,
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-router",
        "zustand",
        "zod",
        "@hugeicons/react",
        "@hugeicons/core-free-icons",
        "motion/react",
        "qrcode",
      ],
    },
    resolve: {
      tsconfigPaths: true,
      alias: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("./src", import.meta.url)),
        },
      ],
    },
    plugins: [
      {
        name: "wails-dev-passthrough",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith("/wails/")) {
              res.statusCode = 404;
              res.end();
              return;
            }
            next();
          });
        },
      },
      tanstackRouter({ target: "react" }),
      tailwindcss(),
      viteReact(),
      babel({
        include: ["src/**/*.tsx", "src/hooks/**"],
        presets: [reactCompilerPreset()],
      }),
    ],
  };
});

export default config;
