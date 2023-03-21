import { h } from "../../lib/my-mini-vue.esm.js";
import { renderSlots } from "../../lib/my-mini-vue.esm.js";
export const Foo = {
  setup() {
    return {};
  },

  /**
   *
   * this.$slots获取挂载在组件实例上的children(instance.children)
   */
  render() {
    const foo = h("p", {}, "foo");
    console.log(this.$slots);
    return h("div", {}, [foo, renderSlots(this.$slots)]);
  },
};
