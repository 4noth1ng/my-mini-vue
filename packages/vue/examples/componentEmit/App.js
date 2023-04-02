import { h } from "../../lib/my-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  name: "App",
  /**
   * 在Foo组件发送emit, 即可在Foo组件的props接收，编译前结果类似 <Foo @onAdd=handler   />
   */
  render() {
    return h("div", {}, [
      h("div", {}, "App"),
      h(Foo, {
        // on + EventName
        onAdd(a, b) {
          console.log("onAdd", a, b);
        },
        onAddFoo(a, b) {
          console.log("onAddFoo", a, b);
        },
      }),
    ]);
  },

  setup() {
    return {};
  },
};
