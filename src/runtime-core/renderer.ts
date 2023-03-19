import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // 调用`patch`方法，处理vnode, 方便后续递归处理

  patch(vnode, container);
}

function patch(vnode, container) {
  // 处理组件
  // 针对vnode 是 component | element类型进行处理
  if (vnode.type === "string") {
    processElement(vnode, container);
  } else if (vnode.type === "object") {
    processComponent(vnode, container);
  }
}

function processElement(vnode, container) {}

function processComponent(vnode, container) {
  // 挂载组件
  mountComponent(vnode, container);
}

function mountComponent(vnode, container) {
  // 创建组件实例, 用于挂载`props`，`slots`等
  const instance = createComponentInstance(vnode);

  // 处理组件
  setupComponent(instance);

  // 调用render函数，得到渲染的虚拟节点
  setupRenderEffect(instance, container);
}

function setupRenderEffect(instance, container) {
  // 虚拟节点树
  const subTree = instance.render();

  // vnode -> patch
  // element类型 vnode -> element -> mountElement

  patch(subTree, container);
}
