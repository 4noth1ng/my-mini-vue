import { h } from "../../lib/my-mini-vue.esm.js";
import { renderSlots } from "../../lib/my-mini-vue.esm.js";
export const Foo = {
  setup() {
    return {};
  },

  /**
   *
   * this.$slots获取挂载在组件实例上的children(instance.children)
   * 具名插槽：实际上就是根据传入的插槽name, 取出对应的vnode，渲染至使用这个name的位置
   */
  render() {
    const foo = h("p", {}, "foo");
    console.log(this.$slots);
    return h("div", {}, [
      renderSlots(this.$slots, "header"),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};
