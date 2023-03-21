import { h } from "../../lib/my-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  name: "App",

  render() {
    const app = h("div", {}, "App");
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => h("p", {}, "header" + age),
        footer: () => h("p", {}, "footer"),
      }
    );

    return h("div", {}, [app, foo]);
  },

  setup() {
    return {};
  },
};
