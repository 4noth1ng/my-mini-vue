import { h, ref, reactive } from "../../lib/my-mini-vue.esm.js";
export default {
  name: "Child",
  setup(props, { emit }) {},
  render(proxy) {
    return h("div", { key: "f" }, [
      h("div", { key: "g" }, "child" + this.$props.msg),
    ]);
  },
};
