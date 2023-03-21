import { hasOwn } from "../shared/index";

const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots,
};

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    // setupState, 也就是`setup`函数返回值
    const { setupState, props } = instance;
    // if (key in setupState) {
    //   return setupState[key];
    // }

    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }

    // key -> $el
    // 为什么不能获取`instance.vnode.el`？ 因为el只在处理element类型vnode时才会被赋值
    // 且赋值给的是element类型vnode上的el，而此时获取的instance.vnode为组件实例的vnode
    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
