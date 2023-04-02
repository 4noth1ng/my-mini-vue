import { h } from "../../lib/my-mini-vue.esm.js";

export const Foo = {
  setup(props) {
    /**
     * props实现：1. 在setup函数接收props
     * 2. 在render内访问到props, 由于之前我们在`instance`上绑定了proxy，且在调用render时，将this绑定到了这个proxy上，实现了代理，所以我们可以对instance.(vnode.)props进行拦截，也就可以访问到
     * 3. props为shallowReadonly类型, 单向数据流
     */
    console.log(props);
    props.count++;
  },

  render() {
    return h("div", {}, "foo: " + this.count);
  },
};
