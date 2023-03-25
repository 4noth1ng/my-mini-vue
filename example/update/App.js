import { h, ref, reactive } from "../../lib/my-mini-vue.esm.js";

export const App = {
  name: "App",
  setup() {
    let count = ref(0);

    const onClick = () => {
      count.value++;
    };

    return {
      count,
      onClick,
    };
  },
  render() {
    return h("div", { id: "root" }, [
      h("div", {}, "count: " + this.count.value),
      h("button", { onClick: this.onClick }, "count++"),
    ]);
  },
};
