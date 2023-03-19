import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // 调用`patch`方法，处理vnode, 方便后续递归处理

  patch(vnode, container);
}

function patch(vnode, container) {
  // 处理组件
  // 针对vnode 是 component | element类型进行处理
  if (typeof vnode.type === "string") {
    processElement(vnode, container);
  } else if (typeof vnode.type === "object") {
    processComponent(vnode, container);
  }
}

function processElement(vnode, container) {
  mountElement(vnode, container);
}

function mountElement(vnode, container) {
  const el = (vnode.el = document.createElement(vnode.type));
  // 判断 vnode.children 类型，如果是string, 直接赋值即可, 如果是数组，则为vnode类型，就继续调用patch处理, 且挂载的容器即为上面的el
  const { children, props } = vnode;
  if (typeof children === "string") {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    mountChildren(vnode, el);
  }

  for (const key in props) {
    const val = props[key];
    el.setAttribute(key, val);
  }
  container.append(el);
}

function mountChildren(vnode, container) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

function processComponent(initialVNode, container) {
  // 挂载组件
  mountComponent(initialVNode, container);
}

function mountComponent(initialVNode, container) {
  // 创建组件实例, 用于挂载`props`，`slots`等
  const instance = createComponentInstance(initialVNode);

  // 处理组件, 挂载属性
  setupComponent(instance);

  // 调用render函数，得到渲染的虚拟节点
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance, initialVNode, container) {
  // 虚拟节点树
  // 将 component类型的vnode初始化为组件实例instance后，调用`render`，进行拆箱，得到该组件对应的虚拟节点
  // 比如根组件得到的就为根虚拟节点

  const { proxy } = instance;
  // 将render的this绑定到proxy上，render内获取this上属性时会被proxy拦截
  const subTree = instance.render.call(proxy);
  // vnode -> patch
  // element类型 vnode -> element -> mountElement

  // 得到虚拟节点树，再次调用patch, 将vnode分为element类型(vnode.type为类似'div'的string)和component类型(vnode.type需初始化为instance)进行处理拆箱, 并挂载
  patch(subTree, container);
  // element 全部挂载后， 获取的el一定是赋值后的
  // 注意：`$el`获取的是组件实例的根dom节点，我们获取的subTree是调用render后生成的dom树，获取的自然是root， 然后我们将这个dom树挂载到 app上
  initialVNode.el = subTree.el;
}
