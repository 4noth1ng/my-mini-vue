import { h } from "../../lib/my-mini-vue.esm.js";

export const App = {
  // 暂不实现模板编译功能
  // 通过直接调用`render`函数
  render() {
    // 视图
    return h("div", "hi, " + this.msg);
  },

  setup() {
    return {
      msg: "mini-vue",
    };
  },
};
