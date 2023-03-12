// 1. 触发`effect`函数， 执行传入的`fn`
// 2. 触发`get`， 执行`track`依赖收集

class ReactiveEffect {
  private _fn: any;
  constructor(fn) {
    this._fn = fn;
  }
  run() {
    activeEffect = this;
    return this._fn();
  }
}

// 全局对象，存放所有target
const targetMap = new Map();
export function track(target, key) {
  // 我们需要一个容器，存储响应式对象的属性对应的所有依赖，对于target
  // 那么这个对应关系就是： target -> key -> deps
  // 所以我们需要一个Map，存放所有target, 还需要一个map来存放该`target`对应`key`的所有dep
  // 考虑到一个`key`可能有相同依赖，对于`dep`的收集，我们使用Set数据结构

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
  // 我们需要将fn存入，如何取得？
  // 因为我们是先进行fn的执行，所以我们可以创建一个全局对象，在fn执行时使其指向当前的ReactiveEffect对象，然后在track中即可取得
  dep.add(activeEffect);
}

// 触发依赖，根据`target`和`key`去除dep表，遍历执行即可
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);
  for (const effect of dep) {
    effect.run();
  }
}

let activeEffect; // 指向当前执行的activeEffect对象

// 调用`effect`函数时，执行传入的`fn`
// 创建`ReactiveEffect`对象，传入`fn`
export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  // 执行`fn`
  _effect.run();
  return _effect.run.bind(_effect);
}
