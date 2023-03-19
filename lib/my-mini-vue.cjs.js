'use strict';

function createComponentInstance(vnode) {
    ({
        vnode,
        type: vnode.type,
    });
    return vnode;
}
function setupComponent(instance) {
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
    const { setup } = Component;
    if (setup) {
        // return function or Object
        // function -> 即为render函数 Object -> 注入函数上下文
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

function render(vnode, container) {
    // 调用`patch`方法，处理vnode, 方便后续递归处理
    patch(vnode);
}
function patch(vnode, container) {
    // 处理组件
    processComponent(vnode);
}
function processComponent(vnode, container) {
    // 挂载组件
    mountComponent(vnode);
}
function mountComponent(vnode, container) {
    // 创建组件实例, 用于挂载`props`，`slots`等
    const instance = createComponentInstance(vnode);
    // 处理组件
    setupComponent(instance);
    // 调用render函数，得到渲染的虚拟节点
    setupRenderEffect(instance);
}
function setupRenderEffect(instance, container) {
    // 虚拟节点树
    const subTree = instance.render();
    // vnode -> patch
    // element类型 vnode -> element -> mountElement
    patch(subTree);
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
    };
    return vnode;
}

function createApp(rootComponent) {
    // createApp(App).mount("#app")
    // 返回一个对象，对象上有`mount`方法
    return {
        // `mount`实际上接收的是一个根容器
        mount(rootContainer) {
            // vue3会将所有东西转化为虚拟节点进行处理, 后续所有逻辑都基于vnode处理
            // 所以我们要先完成根容器 -> vnode的操作
            const vnode = createVNode(rootComponent);
            render(vnode);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

exports.createApp = createApp;
exports.h = h;
