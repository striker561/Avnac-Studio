import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const standardJsonEsm = fileURLToPath(
  new URL(
    "./node_modules/@standard-community/standard-json/dist/index.js",
    import.meta.url,
  ),
);

const config = defineConfig(() => {
  return {
    base: "/",
    resolve: {
      tsconfigPaths: true,
      alias: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("./src", import.meta.url)),
        },
        // Rolldown/Vite 8 can't parse `.cjs` files that contain dynamic
        // `await import(...)`. Force this dep to its ESM entry so the
        // `require` condition from @tambo-ai/client never pulls the CJS
        // shards through the production client build.
        {
          find: /^@standard-community\/standard-json$/,
          replacement: standardJsonEsm,
        },
      ],
    },
    plugins: [
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
