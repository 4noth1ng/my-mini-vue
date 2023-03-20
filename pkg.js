export default {
  dependencies: {
    "@rollup/plugin-typescript": "^11.0.0",
    yarn: "^1.22.19",
  },
  name: "my-mini-vue",
  version: "1.0.0",
  main: "lib/my-mini-vue.cjs.js",
  module: "lib/my-mini-vue.esm.js",
  type: "module",
  scripts: {
    test: "jest",
    build: "rollup -c rollup.config.js",
  },
  repository: "https://github.com/4noth1ng/my-mini-vue.git",
  author: "4noth1ng <1766695958@qq.com>",
  license: "MIT",
  devDependencies: {
    "@babel/core": "^7.21.0",
    "@babel/preset-env": "^7.20.2",
    "@babel/preset-typescript": "^7.21.0",
    "@types/jest": "^29.4.0",
    "babel-jest": "^29.5.0",
    jest: "^29.5.0",
    rollup: "^3.19.1",
    tslib: "^2.5.0",
    typescript: "^4.9.5",
  },
};
