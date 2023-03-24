import { createVNode } from "./vnode";

export function createAppAPI(render) {
  return function createApp(rootComponent) {
    // createApp(App).mount("#app")

    // 返回一个对象，对象上有`mount`方法
    return {
      // `mount`实际上接收的是一个根容器
      mount(rootContainer) {
        // vue3会将所有东西转化为虚拟节点进行处理, 后续所有逻辑都基于vnode处理
        // 所以我们要先完成根容器 -> vnode的操作

        // 首先传入rootComponent -> 得到根组件实例 -> 进行拆箱，得到`component`类型的vnode(即vnode.type为一个对象) ->
        const vnode = createVNode(rootComponent);

        render(vnode, rootContainer);
      },
    };
  };
}
