import typescript from "@rollup/plugin-typescript";
import pkg from "./pkg.js";
export default {
  input: "./src/index.ts",
  output: [
    // 库的打包一般打包多个模块规范版本
    {
      format: "cjs",
      file: pkg.main,
    },
    {
      format: "es",
      file: pkg.module,
    },
  ],
  plugins: [typescript()],
};
