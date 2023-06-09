const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        key: (props && props.key) || null,
        shapeFlag: getShapeFlag(type),
        el: null,
        component: null,
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

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const hasChanged = (newVal, oldVal) => {
    return !Object.is(newVal, oldVal);
};
const isString = (val) => typeof val === "string";
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
const isEmptyObject = (obj) => {
    return Object.keys(obj).length === 0;
};

// 1. 触发`effect`函数， 执行传入的`fn`
// 2. 触发`get`， 执行`track`依赖收集
let activeEffect; // 指向当前执行的ReactiveEffect对象
let shouldTrack;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true; // 判断是否重复调用 stop(runner)，`active` = false代表调用了`stop`
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // shouldTrack区分是否需要收集依赖，当触发this._fn时，会触发track
        // 因此当this.active=false, 也就是处于stop时，我们运行_fn后直接return 保持shouldTack = fasle
        if (!this.active) {
            return this._fn();
        }
        // 需要收集：
        shouldTrack = true;
        activeEffect = this; // 执行effect函数时，将`activeEffect`指向当前的对象
        const result = this._fn();
        shouldTrack = false; // 关闭Track通道
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
// 全局对象，存放所有target
const targetMap = new Map();
function track(target, key) {
    // 我们需要一个容器，存储响应式对象的属性对应的所有依赖，对于target
    // 那么这个对应关系就是： target -> key -> deps
    // 所以我们需要一个Map，存放所有target, 还需要一个map来存放该`target`对应`key`的所有dep
    // 考虑到一个`key`可能有相同依赖，对于`dep`的收集，我们使用Set数据结构
    // if (!activeEffect) return; // 如果只是单纯获取响应式对象的属性，即没有调用`effect`，则无需收集依赖
    // if (!shouldTrack) return; // 如果无需收集依赖(即已经为stop状态)，直接return
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    // depsMap: `key`为响应式对象的键`key`， `value`为这个`key`对应的依赖
    if (!depsMap) {
        // init
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        // init
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    // 我们需要将fn存入，如何取得？
    // 因为我们是先进行fn的执行，所以我们可以创建一个全局对象，在fn执行时使其指向当前的ReactiveEffect对象，然后在track中即可取得
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
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
// 调用`effect`函数时，执行传入的`fn`
// 创建`ReactiveEffect`对象，传入`fn`
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    extend(_effect, options);
    // 执行`fn`
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
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
        if (!isReadonly) {
            track(target, key);
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
function isReactive(value) {
    // 传入的判断的对象
    // 只有`reactive`和`readonly`两种情况 -> `isReadonly`在创建get对象时判断
    // 即通过触发get，在get中返回一个值判断其属性
    return !!value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */];
}
function isReadonly(value) {
    return !!value["__v_isReadonly" /* ReactiveFlags.IS_READONLY */];
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.warn("raw needs to be an Object  ", raw);
        return;
    }
    return new Proxy(raw, baseHandlers);
}

/**
 * `ref`存在的意义在于当需要对基本数据类型进行响应式处理时，proxy无法拦截(只针对对象)
 * 所以我们创建一个类，将基本数据类型作为`RefImpl`的一个`key`的值，然后通过`get`和`set`即可进行拦截
 *
 */
class RefImpl {
    constructor(value) {
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        // 依赖收集
        /**
         * 由于`ref`对象只有`value`一个key
         * 所以我们收集时只需要一个Set存储每次的`activeEffect`即可
         * 如果我们不需要进行依赖收集，就直接return this._value即可，否则会存入`activeEffect = undefined`
         */
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 如果set的值与原来的值相同，则无需重复触发依赖
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            // 触发依赖
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    console.log(isObject(value));
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return ref instanceof RefImpl;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRefs) {
    // 创建proxy
    return new Proxy(objectWithRefs, {
        get(target, key) {
            // 如果是ref 返回value 否则返回其值即可
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            // 当原有的值是`ref`且新的值不是`ref`，则对原有`ref`的.value进行赋值
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
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
    $props: (i) => i.props,
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
        next: null,
        setupState: {},
        props: {},
        slots: {},
        isMounted: false,
        subTree: {},
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
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
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

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

// 响应式数据更新 -> 触发scheduler -> 第一次进入 isFlushing 为 false, 创建微任务，关闭创建微任务入口
// 每次调用，不断将runner添加进queue中
// 同步任务执行完毕后，微任务取出，遍历queue执行runner，清空queue
const queue = new Set();
// const queue: any[] = [];
let isFlushing = false; // 是否正在进行刷新队列
const p = Promise.resolve();
function nextTick(fn) {
    return fn ? Promise.resolve().then(fn) : Promise.resolve();
}
function queueJobs(job) {
    queue.add(job); // 将runner添加
    if (!isFlushing) {
        isFlushing = true;
        p.then(() => {
            try {
                queue.forEach((job) => job());
            }
            finally {
                isFlushing = false;
                queue.clear();
            }
        });
    }
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container, parentComponent) {
        // 调用`patch`方法，处理vnode, 方便后续递归处理
        patch(null, vnode, container, parentComponent);
    }
    function patch(n1, n2, container, parentComponent) {
        try {
            // 处理组件
            // 针对vnode 是 component | element类型进行处理
            const { type, shapeFlag } = n2;
            // Fragment -> 只渲染 children
            switch (type) {
                case Fragment:
                    processFragment(n1, n2, container, parentComponent);
                    break;
                case Text:
                    processText(n1, n2, container);
                    break;
                default:
                    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                        processElement(n1, n2, container, parentComponent);
                    }
                    else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                        processComponent(n1, n2, container, parentComponent);
                    }
                    break;
            }
        }
        catch (error) { }
    }
    function processFragment(n1, vnode, container, parentComponent) {
        mountChildren(vnode.children, container, parentComponent);
    }
    function processText(n1, vnode, container) {
        const { children } = vnode;
        const textNode = (vnode.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            // init
            mountElement(n2, container, parentComponent);
        }
        else {
            // diff
            patchElement(n1, n2, container, parentComponent);
        }
    }
    function patchElement(n1, n2, container, parentComponent) {
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        const el = (n2.el = n1.el);
        console.log(n1, n2);
        patchChildren(n1, n2, el, parentComponent);
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent) {
        const prevShapeFlag = n1.shapeFlag;
        const shapeFlag = n2.shapeFlag;
        const c1 = n1.children;
        const c2 = n2.children;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // 新的children 为 TEXT类型
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 1. 如果老的children为ARRAY类型，把老的children清空
                unmountChildren(n1.children);
            }
            if (c1 !== c2) {
                // 2. 设置text
                hostSetElementText(container, c2);
            }
        }
        else {
            // 新的children为ARRAY类型
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // 旧的为TEXT
                hostSetElementText(container, "");
                mountChildren(c2, container, parentComponent);
            }
            else if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 旧的为ARRAY
                patchKeyedChildren(c1, c2, container, parentComponent);
            }
        }
    }
    function patchKeyedChildren(oldChildren, newChildren, container, parentComponent) {
        // 1. 处理相同前缀 定义索引j指向新旧两组子节点的开头
        let j = 0;
        let oldVNode = oldChildren[j];
        let newVNode = newChildren[j];
        while (oldVNode.key === newVNode.key) {
            patch(oldVNode, newVNode, container, parentComponent);
            j++;
            oldVNode = oldChildren[j];
            newVNode = newChildren[j];
        }
        // 2. 处理相同后缀，由于新旧两组子节点不同，所以定义两个指针
        let oldEnd = oldChildren.length - 1;
        let newEnd = newChildren.length - 1;
        oldVNode = oldChildren[oldEnd];
        newVNode = newChildren[newEnd];
        while (oldVNode.key === newVNode.key) {
            patch(oldVNode, newVNode, container, parentComponent);
            oldVNode = oldChildren[--oldEnd];
            newVNode = newChildren[--newEnd];
        }
        //3. 处理完前缀后缀，如果新节点数组仍有剩余，则需插入, 如何判断有剩余？ 易得：j > oldEnd说明旧节点处理完毕， j <= newEnd 说明新节点未处理完毕，则当二者符合时，满足条件
        if (j > oldEnd && j <= newEnd) {
            // 将[j, newEnd]内的所有节点插入到 newEnd的后一个节点之前
            const anchorIdx = newEnd + 1;
            const anchor = anchorIdx < newChildren.length ? newChildren[anchorIdx].el : null;
            while (j <= newEnd) {
                patch(null, newChildren[j], container, parentComponent);
                hostInsert(newChildren[j++].el, container, anchor);
            }
        }
        // 4. 如果旧节点数组仍有剩余，则需卸载，同上，当 j > newEnd说明新节点处理完毕， 当 j <= oldEnd 说明旧节点未处理完毕
        else if (j > newEnd && j <= oldEnd) {
            // 卸载 [j, oldEnd] 之间的节点
            while (j <= oldEnd) {
                hostRemove(oldChildren[j++].el);
            }
        }
        // 5. 新旧都有剩余
        else {
            // 构建source数组，用于存放新的一组子节点在旧的一组子节点的索引
            const count = newEnd - j + 1; // 需要更新的新节点数量
            const source = Array(count).fill(0);
            source.fill(-1);
            // oldStart 和 newStart 分别为起始索引，即j
            const oldStart = j;
            const newStart = j;
            let moved = false; // 代表是否需要移动节点
            let pos = 0; // 代表遍历旧节点时遇到的最大索引值，当pos呈现递增时，说明无需移动节点
            // 构建索引表, key为新节点VNode的key，value为下标索引值, 用来寻找具有相同key的可复用节点
            const keyIndex = {};
            for (let i = newStart; i <= newEnd; i++) {
                keyIndex[newChildren[i].key] = i;
            }
            // 代表更新过的节点数量
            let patched = 0;
            // 遍历旧的一组子节点中剩余未处理的节点
            for (let i = oldStart; i <= oldEnd; i++) {
                oldVNode = oldChildren[i];
                if (patched <= count) {
                    const k = keyIndex[oldVNode.key];
                    if (typeof k !== "undefined") {
                        // 存在可复用节点
                        newVNode = newChildren[k];
                        patch(oldVNode, newVNode, container, parentComponent);
                        patched++;
                        source[k - newStart] = i;
                        if (k < pos) {
                            // 当前索引比最大索引要小，即在oldChildren中当前newVNode靠前, 需要移动
                            moved = true;
                        }
                        else {
                            pos = k;
                        }
                    }
                    else {
                        // 该旧节点不存在于新节点数组中，则直接卸载
                        hostRemove(oldVNode.el);
                    }
                }
                else {
                    // patched > count 即新节点已经更新完毕， 剩余旧节点需要进行卸载
                    hostRemove(oldVNode.el);
                }
            }
            if (moved) {
                const seq = getSequence(source);
                let s = seq.length; // s 指向递增子序列的最后一个元素
                let i = count - 1; // i + newStart 指向需要更新的新节点序列最后一个元素
                for (i; i >= 0; i--) {
                    if (source[i] === -1) {
                        // 旧节点数组中不存在该元素，直接进行挂载
                        const pos = i + newStart;
                        const newVNode = newChildren[pos];
                        const nextPos = pos + 1;
                        const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
                        patch(null, newVNode, container, parentComponent);
                        hostInsert(newVNode.el, container, anchor);
                    }
                    else if (i !== seq[s]) {
                        // 当前新节点不属于递增子序列的部分，所以该节点需要进行移动
                        const pos = i + newStart;
                        const newVNode = newChildren[pos];
                        const nextPos = pos + 1;
                        // 移动到他在newChildren的后一个节点之前
                        const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
                        hostInsert(newVNode.el, container, anchor);
                    }
                    else {
                        // 存在于递增子序列中，无需移动, s向前移动
                        s--;
                    }
                }
            }
        }
    }
    // TODO: 理解最长递增子序列(二分+贪心+前驱)算法
    function getSequence(arr) {
        const p = arr.slice();
        const result = [0];
        let i, j, u, v, c;
        const len = arr.length;
        for (i = 0; i < len; i++) {
            const arrI = arr[i];
            if (arrI !== 0) {
                j = result[result.length - 1];
                if (arr[j] < arrI) {
                    p[i] = j;
                    result.push(i);
                    continue;
                }
                u = 0;
                v = result.length - 1;
                while (u < v) {
                    c = (u + v) >> 1;
                    if (arr[result[c]] < arrI) {
                        u = c + 1;
                    }
                    else {
                        v = c;
                    }
                }
                if (arrI < arr[result[u]]) {
                    if (u > 0) {
                        p[i] = result[u - 1];
                    }
                    result[u] = i;
                }
            }
        }
        u = result.length;
        v = result[u - 1];
        while (u-- > 0) {
            result[u] = v;
            v = p[v];
        }
        return result;
    }
    function unmountChildren(children) {
        for (const child of children) {
            const el = child.el;
            // remove
            hostRemove(el);
        }
    }
    function patchProps(el, oldProps, newProps) {
        if (isEmptyObject(oldProps) && isEmptyObject(newProps))
            return;
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null);
                }
            }
        }
    }
    function mountElement(vnode, container, parentComponent) {
        const el = (vnode.el = hostCreateElement(vnode.type));
        // 判断 vnode.children 类型，如果是string, 直接赋值即可, 如果是数组，则为vnode类型，就继续调用patch处理, 且挂载的容器即为上面的el
        const { children, props, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent);
        }
        // 判断是否是注册事件
        for (const key in props) {
            const val = props[key];
            // on + Event name
            hostPatchProp(el, key, null, val);
        }
        // container.append(el);
        hostInsert(el, container);
    }
    function mountChildren(children, container, parentComponent) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent);
        });
    }
    function processComponent(n1, initialVNode, container, parentComponent) {
        if (!n1) {
            // 挂载组件
            mountComponent(initialVNode, container, parentComponent);
        }
        else {
            // 更新组件
            updateComponent(n1, initialVNode);
        }
        // mountComponent(initialVNode, container, parentComponent);
    }
    function updateComponent(n1, n2) {
        debugger;
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVNode, container, parentComponent) {
        // 创建组件实例, 用于挂载`props`，`slots`等
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        // 处理组件, 挂载属性
        setupComponent(instance);
        // 调用render函数，得到渲染的虚拟节点
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        /**
         * 我们需要在虚拟节点更新时触发`render`，如何实现？将render作为依赖传入effect进行收集, 当响应式对象改变时，依赖会被触发重新render
         */
        // 存储runner
        instance.update = effect(() => {
            if (!instance.isMounted) {
                // 第一次挂载时，渲染全部
                // 虚拟节点树
                // 将 component类型的vnode初始化为组件实例instance后，调用`render`，进行拆箱，得到该组件对应的虚拟节点
                // 比如根组件得到的就为根虚拟节点
                const { proxy } = instance;
                // 将render的this绑定到proxy上，render内获取this上属性时会被proxy拦截
                // 由于render函数编译后直接获取第一个参数_ctx上的属性，所以将proxy传入
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                // vnode -> patch
                // element类型 vnode -> element -> mountElement
                // 得到虚拟节点树，再次调用patch, 将vnode分为element类型(vnode.type为类似'div'的string)和component类型(vnode.type需初始化为instance)进行处理拆箱, 并挂载
                patch(null, subTree, container, instance);
                // element 全部挂载后， 获取的el一定是赋值后的
                // 注意：`$el`获取的是组件实例的根dom节点，我们获取的subTree是调用render后生成的dom树，获取的自然是root， 然后我们将这个dom树挂载到 app上
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                // 进行diff判断，最小化更新
                const { proxy } = instance;
                const subTree = instance.render.call(proxy, proxy);
                // 旧vnode树
                const prevSubTree = instance.subTree;
                patch(prevSubTree, subTree, container, instance); // 更新children
                // 还需要更新props
                instance.subTree = subTree;
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key, nextVal);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    createElementVNode: createVNode,
    createRenderer: createRenderer,
    createTextVNode: createTextVNode,
    effect: effect,
    getCurrentInstance: getCurrentInstance,
    h: h,
    inject: inject,
    isProxy: isProxy,
    isReactive: isReactive,
    isReadonly: isReadonly,
    isRef: isRef,
    nextTick: nextTick,
    provide: provide,
    proxyRefs: proxyRefs,
    reactive: reactive,
    readonly: readonly,
    ref: ref,
    registerRuntimeCompiler: registerRuntimeCompiler,
    renderSlots: renderSlots,
    shallowReadonly: shallowReadonly,
    toDisplayString: toDisplayString,
    unRef: unRef
});

function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
function parseChildren(context, ancestors) {
    const nodes = [];
    // 循环处理各种类型
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        // 如果 context 是以 '{{' 开头的才处理
        if (context.source.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                // 如果是以 '< + 字母' 开始，则按照标签解析
                node = parseElement(context, ancestors);
            }
        }
        else {
            // 解析文本
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
// 判断是否结束
// 结束条件：1.结束标签 2.长度为0
function isEnd(context, ancestors) {
    const s = context.source;
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    return !context.source;
}
function parseText(context) {
    // 文本后面可能是标签，也可能是插值
    let endIndex = context.source.length;
    let endTokens = ["{{", "<"];
    // 获取更靠近文本开始的结束符号的下标
    for (let i = 0; i <= endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    // 直接获取文本内容
    const content = context.source.slice(0, endIndex);
    // 推进已经获取的文本内容长度
    advanceBy(context, endIndex);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content,
    };
}
function parseElement(context, ancestors) {
    const element = parseTag(context, 0 /* TagType.Start */);
    // 处理标签时，需要判断标签是否配套
    // 因为标签有可能嵌套，所以使用栈来存储
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    // 当处理完一层配套的标签，就可以将处理完的标签从栈中移除
    ancestors.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        // 处理结束标签的时候，需要先判断是否和之前的标签是配套的
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        // 如果没有配套的结束标签，抛出异常
        throw new Error(`缺少结束标签：${element.tag}`);
    }
    return element;
}
// 判断结束标签是否和开始标签配套
function startsWithEndTagOpen(source, tag) {
    return (source.startsWith("</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}
function parseTag(context, type) {
    const match = /^<\/?([a-z]*)>/.exec(context.source);
    const tag = match[1];
    advanceBy(context, match[0].length);
    // 如果是结束标签则不需要返回
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
    };
}
function parseInterpolation(context) {
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    // 获取结束符号的位置
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    // 截取开始符号之后的内容
    advanceBy(context, openDelimiter.length);
    // 获取有效内容的长度
    const rawContentLength = closeIndex - openDelimiter.length;
    // 获取有效内容
    const rawContent = context.source.slice(0, rawContentLength);
    // 去掉有效内容的空格
    const content = rawContent.trim();
    // 截去已处理的内容
    advanceBy(context, rawContentLength + closeDelimiter.length);
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: content,
        },
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */,
    };
}
function createParserContext(content) {
    return {
        source: content,
    };
}

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperMapName = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode",
};

function transform(root, options = {}) {
    const context = createTransformerContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
function createTransformerContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}
function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit) {
            exitFns.push(onExit);
        }
    }
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children,
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const vnodeTag = `'${node.tag}'`;
            let vnodeProps;
            const children = node.children;
            let vnodeChildren = children[0];
            const vnodeElement = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
            node.codegenNode = vnodeElement;
        };
    }
}

function isText(node) {
    return node.type === 3 /* NodeTypes.TEXT */ || node.type === 0 /* NodeTypes.INTERPOLATION */;
}

function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESS */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(" + ");
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(", ");
    push(`function ${functionName}(${signature}){`);
    push(`return `);
    genNode(ast.codegenNode, context);
    push("}");
    return {
        code: context.code,
    };
}
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = "Vue";
    const aliasHelper = (s) => `${helperMapName[s]}:_${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`);
    }
    push("\n");
    push("return ");
}
function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESS */:
            genCompoundExpression(node, context);
            break;
    }
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const { children } = node;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(")");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(", ");
        }
    }
}
function genNullable(args) {
    return args.map((arg) => arg || "null");
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

// mini-vue 出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function("Vue", code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { createApp, createVNode as createElementVNode, createRenderer, createTextVNode, effect, getCurrentInstance, h, inject, isProxy, isReactive, isReadonly, isRef, nextTick, provide, proxyRefs, reactive, readonly, ref, registerRuntimeCompiler, renderSlots, shallowReadonly, toDisplayString, unRef };
