import { h } from "../../lib/my-mini-vue.esm.js";

export const App = {
  // 暂不实现模板编译功能
  // 通过直接调用`render`函数
  render() {
    // 视图
    return h(
      "div",
      {
        id: "root",
        class: ["red", "hard"],
      },
      [h("p", { class: "blue" }, "sb"), h("p", { class: "green" }, "czc")]
    );
  },

  setup() {
    return {
      msg: "mini-vue",
    };
  },
};
