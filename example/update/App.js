import { h, ref, reactive } from "../../lib/my-mini-vue.esm.js";

export const App = {
  name: "App",
  setup() {
    const count = ref(0);

    const onClick = () => {
      count.value++;
    };

    let props = reactive({
      foo: "foo",
      bar: "bar",
    });

    const onChangePropsDemo1 = () => {
      props.foo = "new-foo";
    };

    const onChangePropsDemo2 = () => {
      props.foo = undefined;
    };

    return {
      count,
      onClick,
      onChangePropsDemo1,
      onChangePropsDemo2,
      props,
    };
  },
  render() {
    return h("div", { id: "root", ...this.props }, [
      h("div", {}, "count: " + this.count.value),
      h("button", { onClick: this.onClick }, "count++"),
      h("button", { onClick: this.onChangePropsDemo1 }, "修改值"),
      h("button", { onClick: this.onChangePropsDemo2 }, "bar属性被删除"),
    ]);
  },
};
