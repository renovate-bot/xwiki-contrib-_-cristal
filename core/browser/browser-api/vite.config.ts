import { defineConfig, mergeConfig } from "vite";
import defaultConfig from "../../../vite.default.config";

export default mergeConfig(
  defaultConfig,
  defineConfig({
    build: {
      lib: {
        entry: "./src/index.ts",
        name: "apisbrowser",
      },
    },
  }),
);