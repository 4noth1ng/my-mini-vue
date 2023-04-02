import { h, getCurrentInstance } from "../../lib/my-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  name: "App",
  render() {
    return h("div", {}, ["p", {}, "currentInstance demo", h(Foo)]);
  },
  setup() {
    const instance = getCurrentInstance();
    console.log("App: ", instance);
  },
};
