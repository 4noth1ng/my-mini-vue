function createComponentInstance(vnode) {
    ({
        vnode,
        type: vnode.type,
        setupState: {},
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
    // ctx 在instance即组件实例上绑定proxy，然后在调用render时，将render上的this绑定到proxy上
    instance.proxy = new Proxy({}, {
        get(target, key) {
            // setupState, 也就是`setup`函数返回值
            const { setupState } = instance;
            if (key in setupState) {
                return setupState[key];
            }
        },
    });
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

function render(vnode, container) {
    // 调用`patch`方法，处理vnode, 方便后续递归处理
    patch(vnode, container);
}
function patch(vnode, container) {
    // 处理组件
    // 针对vnode 是 component | element类型进行处理
    if (typeof vnode.type === "string") {
        processElement(vnode, container);
    }
    else if (typeof vnode.type === "object") {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const el = document.createElement(vnode.type);
    // 判断 vnode.children 类型，如果是string, 直接赋值即可, 如果是数组，则为vnode类型，就继续调用patch处理, 且挂载的容器即为上面的el
    const { children, props } = vnode;
    if (typeof children === "string") {
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
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
    // 将 component类型的vnode初始化为组件实例instance后，调用`render`，进行拆箱，得到该组件对应的虚拟节点
    // 比如根组件得到的就为根虚拟节点
    const { proxy } = instance;
    // 将render的this绑定到proxy上，render内获取this上属性时会被proxy拦截
    const subTree = instance.render.call(proxy);
    // vnode -> patch
    // element类型 vnode -> element -> mountElement
    // 得到虚拟节点树，再次调用patch, 将vnode分为element类型(vnode.type为类似'div'的string)和component类型(vnode.type需初始化为instance)进行处理拆箱, 并挂载
    patch(subTree, container);
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
            // 首先传入rootComponent -> 得到根组件实例 -> 进行拆箱，得到`component`类型的vnode(即vnode.type为一个对象) ->
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
