import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
  };
  return component;
}

export function setupComponent(instance) {
  // TODO
  // initProps()
  // initSlots()

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
    // return function or Object
    // function -> 即为render函数 Object -> 注入函数上下文({msg: 'hi mini-vue'})
    const setupResult = setup();

    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult) {
  // function | Object
  // TODO function

  if (typeof setupResult === "object") {
    instance.setupState = setupResult;
  }

  // 保证render有值
  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  const Component = instance.type;

  if (Component.render) {
    // 如果组件对象有render，就把他赋值给实例对象
    instance.render = Component.render;
  }
}
