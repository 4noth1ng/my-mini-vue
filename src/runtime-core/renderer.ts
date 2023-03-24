import { extend } from "./../shared/index";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";

export function createRenderer(options) {
  const { createElement, patchProp, insert } = options;

  function render(vnode, container, parentComponent) {
    // 调用`patch`方法，处理vnode, 方便后续递归处理

    patch(vnode, container, parentComponent);
  }

  function patch(vnode, container, parentComponent) {
    // 处理组件
    // 针对vnode 是 component | element类型进行处理
    const { type, shapeFlag } = vnode;

    // Fragment -> 只渲染 children
    switch (type) {
      case Fragment:
        processFragment(vnode, container, parentComponent);
        break;
      case Text:
        processText(vnode, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(vnode, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(vnode, container, parentComponent);
        }
        break;
    }
  }

  function processFragment(vnode, container, parentComponent) {
    mountChildren(vnode, container, parentComponent);
  }

  function processText(vnode, container) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processElement(vnode, container, parentComponent) {
    mountElement(vnode, container, parentComponent);
  }

  function mountElement(vnode, container, parentComponent) {
    const el = (vnode.el = createElement(vnode.type));
    // 判断 vnode.children 类型，如果是string, 直接赋值即可, 如果是数组，则为vnode类型，就继续调用patch处理, 且挂载的容器即为上面的el
    const { children, props, shapeFlag } = vnode;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parentComponent);
    }
    // 判断是否是注册事件
    for (const key in props) {
      const val = props[key];
      // on + Event name

      patchProp(el, key, val);
    }
    // container.append(el);
    insert(el, container);
  }

  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
      patch(v, container, parentComponent);
    });
  }

  function processComponent(initialVNode, container, parentComponent) {
    // 挂载组件
    mountComponent(initialVNode, container, parentComponent);
  }

  function mountComponent(initialVNode, container, parentComponent) {
    // 创建组件实例, 用于挂载`props`，`slots`等
    const instance = createComponentInstance(initialVNode, parentComponent);

    // 处理组件, 挂载属性
    setupComponent(instance);

    // 调用render函数，得到渲染的虚拟节点
    setupRenderEffect(instance, initialVNode, container);
  }

  function setupRenderEffect(instance, initialVNode, container) {
    /**
     * 我们需要在虚拟节点更新时触发`render`，如何实现？将render作为依赖传入effect进行收集
     */
    effect(() => {
      // 虚拟节点树
      // 将 component类型的vnode初始化为组件实例instance后，调用`render`，进行拆箱，得到该组件对应的虚拟节点
      // 比如根组件得到的就为根虚拟节点

      const { proxy } = instance;
      // 将render的this绑定到proxy上，render内获取this上属性时会被proxy拦截
      const subTree = instance.render.call(proxy);
      // vnode -> patch
      // element类型 vnode -> element -> mountElement

      // 得到虚拟节点树，再次调用patch, 将vnode分为element类型(vnode.type为类似'div'的string)和component类型(vnode.type需初始化为instance)进行处理拆箱, 并挂载
      patch(subTree, container, instance);
      // element 全部挂载后， 获取的el一定是赋值后的
      // 注意：`$el`获取的是组件实例的根dom节点，我们获取的subTree是调用render后生成的dom树，获取的自然是root， 然后我们将这个dom树挂载到 app上
      initialVNode.el = subTree.el;
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
