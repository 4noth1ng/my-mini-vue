const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
// 传入add 生成onAdd add-foo -> onAddFoo
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

// 全局对象，存放所有target
const targetMap = new Map();
// 触发依赖，根据`target`和`key`去除dep表，遍历执行即可
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        // 如果传入`scheduler`，则执行`scheduler`
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            // 没传执行`fn`
            effect.run();
        }
    }
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        // 如果res是对象，那么继续递归将其转为响应式
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key: ${key}是readonly类型的，不能被修改, ${target}`);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.warn("raw needs to be an Object  ", raw);
        return;
    }
    return new Proxy(raw, baseHandlers);
}

function emit(instance, event, ...args) {
    // 用户调用emit时只传递事件名和参数， 如何获取instance？ 可在绑定时使用bind(null, args)传递component，确定arg0
    // instance.props -> event
    const { props } = instance;
    const handlerName = toHandlerKey(camelize(event));
    //   console.log(handler);
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // setupState, 也就是`setup`函数返回值
        const { setupState, props } = instance;
        // if (key in setupState) {
        //   return setupState[key];
        // }
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
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

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectValue(children, instance.slots);
    }
}
function normalizeObjectValue(children, slots) {
    /**
     * 具名插槽
     * key为插槽name,同时也对应渲染的位置， value为对应的vnode
     * 这里使用引用instance.slots直接改变其值
     *
     * 所以此处的逻辑主要是将对应的vnode与name相关联，并处理vnode为vnode数组的情况
     */
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        emit: (e) => { },
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
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
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null,
    };
    // children
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // 如何确定需要initSlots，即如何判断传入的是slots?
    // 需满足组件类型vnode + children为object类型
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function createAppAPI(render) {
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

function createRenderer(options) {
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
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(vnode, container, parentComponent);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
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
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
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
    }
    return {
        createApp: createAppAPI(render),
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            // 形如：header: (age) => h("div", {}, "header" + age)
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

function provide(key, value) {
    // 存
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        // 只在init阶段进行，因为当多次调用`provide`时，每次都调用会覆盖前面的`provides`
        // 如何判断时init状态？ 当我们为instance对象初始化时，provides被赋值为parent.provides，根据这一点判断
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultVal) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultVal) {
            if (typeof defaultVal === "function")
                return defaultVal();
            else
                return defaultVal;
        }
    }
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, val) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
    }
    else {
        el.setAttribute(key, val);
    }
}
function insert(el, parent) {
    parent.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, renderSlots };
