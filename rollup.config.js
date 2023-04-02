import typescript from "@rollup/plugin-typescript";
import pkg from "./pkg.js";
export default {
  input: "./packages/vue/src/index.ts",
  output: [
    // 库的打包一般打包多个模块规范版本
    {
      format: "cjs",
      file: "packages/vue/dist/my-mini-vue.cjs.js",
    },
    {
      format: "es",
      file: "packages/vue/dist/my-mini-vue.esm.js",
    },
  ],
  plugins: [typescript()],
};
