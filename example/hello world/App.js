import { h } from "../../lib/my-mini-vue.esm.js";

window.self = null;
export const App = {
  // 暂不实现模板编译功能
  // 通过直接调用`render`函数
  render() {
    window.self = this;
    // 视图
    return h(
      "div",
      {
        id: "root",
        class: ["red", "hard"],
        onClick() {
          console.log("click");
        },
        onMouseover() {
          console.log("mouse over");
        },
      },
      // [h("p", { class: "blue" }, "sb"), h("p", { class: "green" }, "czc")]
      /**
       * 想要获取`this.msg`，就需要获取到`setup`的返回值，最简单的方法就是把`setup`的返回值绑定到`render这个函数的this上, instance组件实例上的setupState就保存了`setup`
       * 然而我们还需要获取诸如`this.$data`， `this.$el`等对象，所以没有采用简单的进行绑定
       * 这里采取的是proxy代理的模式
       */
      "hello, " + this.msg
    );
  },

  setup() {
    return {
      msg: "mini-sssvue",
    };
  },
};
