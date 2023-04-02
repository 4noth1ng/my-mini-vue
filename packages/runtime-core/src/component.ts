import { shallowReadonly } from "@my-mini-vue/reactivity";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";
import { proxyRefs } from "@my-mini-vue/reactivity";
export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    next: null, // 下次要更新的虚拟节点
    setupState: {},
    props: {},
    slots: {},
    isMounted: false,
    subTree: {},
    provides: parent ? parent.provides : {},
    parent,
    emit: (e: any) => {},
  };
  component.emit = emit.bind(null, component);
  return component;
}

export function setupComponent(instance) {
  // TODO
  initProps(instance, instance.vnode.props);
  initSlots(instance, instance.vnode.children);

  // 处理有状态的组件( 区别于无状态的函数组件 )
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  // 调用`setup`, 获取到`setup`的返回值
  // 如何获取`setup`? instance -> vnode -> type(rootComponent) -> setup
  const Component = instance.type;
  // ctx 在instance即组件实例上绑定proxy，然后在调用render时，将render上的this绑定到proxy上
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
  const { setup } = Component;

  if (setup) {
    setCurrentInstance(instance);
    // return function or Object
    // function -> 即为render函数 Object -> 注入函数上下文({msg: 'hi mini-vue'})
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    setCurrentInstance(null);
    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult) {
  // function | Object
  // TODO function

  if (typeof setupResult === "object") {
    instance.setupState = proxyRefs(setupResult);
  }

  // 保证render有值
  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  const Component = instance.type;

  if (compiler && !Component.render) {
    // 用户编写的render函数优先级更高
    if (Component.template) {
      Component.render = compiler(Component.template);
    }
  }
  if (Component.render) {
    // 如果组件对象有render，就把他赋值给实例对象
    instance.render = Component.render;
  }
}

let currentInstance = null;
export function getCurrentInstance() {
  return currentInstance;
}
export function setCurrentInstance(instance) {
  currentInstance = instance;
}

let compiler;

export function registerRuntimeCompiler(_compiler) {
  compiler = _compiler;
}
