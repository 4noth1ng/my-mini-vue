import { h, provide, inject } from "../../lib/my-mini-vue.esm.js";

/**
 * provide提供数据，可以跨树层传递，我们依旧可以考虑在组件实例上绑定、获取
 * 实际上provide，inject这个功能维护在每个组件上的providers对象，在查找inject时是类似于原型链的查找
 * 即在Consumer组件内inject("Foo"), 首先查找ProviderTwo组件实例上的providers有无`Foo`属性
 * 如果没有，再往上搜索Provider组件实例对象，实际上这个操作只需操作在给`provider`对象赋值时使用继承的方式创建即可
 */
const Provider = {
  name: "provider",
  setup() {
    provide("foo", "fooVal"), provide("bar", "barVal");
  },
  render() {
    return h("div", {}, [h("p", {}, "Provider"), h(ProviderTwo)]);
  },
};

const ProviderTwo = {
  name: "providerTwo",
  setup() {
    provide("foo", "fooTwo");
    const foo = inject("foo");
    return {
      foo,
    };
  },
  render() {
    return h("div", {}, [
      h("p", {}, `ProviderTwo foo:${this.foo}`),
      h(Consumer),
    ]);
  },
};

const Consumer = {
  name: "Consumer",
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    const baz = inject("baz", () => "default");

    return {
      foo,
      bar,
      baz,
    };
  },
  render() {
    return h("div", {}, `Consumer: - ${this.foo}- ${this.bar}=---${this.baz}`);
  },
};

export const App = {
  name: "App",
  setup() {},
  render() {
    return h("div", {}, ["66666", h(Provider)]);
  },
};
