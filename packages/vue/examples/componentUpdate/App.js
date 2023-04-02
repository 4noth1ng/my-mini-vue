// 在 render 中使用 proxy 调用 emit 函数
// 也可以直接使用 this
// 验证 proxy 的实现逻辑
import { h, ref } from "../../lib/my-mini-vue.esm.js";
import Child from "./Child.js";

export default {
  name: "App",
  setup() {
    const msg = ref("123");
    const count = ref(1);
    window.msg = msg;

    const changeChildProps = () => {
      msg.value = "456";
    };

    const changeCount = () => {
      count.value++;
    };

    return { msg, changeChildProps, count, changeCount };
  },

  render() {
    return h("div", { key: "a" }, [
      h("div", { key: "b" }, "你好"),
      h(
        "button",
        {
          onClick: this.changeChildProps,
        },
        "change child props"
      ),
      h(Child, {
        msg: this.msg,
        key: "c",
      }),
      h(
        "button",
        {
          onClick: this.changeCount,
          key: "d",
        },
        "change self count"
      ),
      h("p", { key: "e" }, "count: " + this.count),
    ]);
  },
};
