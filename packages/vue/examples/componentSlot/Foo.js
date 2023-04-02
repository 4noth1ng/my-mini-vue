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
   * 作用域插槽： 子组件在渲染时将一部分数据提供给插槽，从而提供给，可以考虑将插槽转化为一个函数通过形参传值
   */
  render() {
    const foo = h("p", {}, "foo");
    const age = 19;

    console.log(this.$slots);
    return h("div", {}, [
      renderSlots(this.$slots, "header", {
        age,
      }),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};
