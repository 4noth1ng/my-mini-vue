import { extend } from "@my-mini-vue/shared";
// 1. 触发`effect`函数， 执行传入的`fn`
// 2. 触发`get`， 执行`track`依赖收集

let activeEffect; // 指向当前执行的ReactiveEffect对象
let shouldTrack;

export class ReactiveEffect {
  private _fn: any;
  deps = [];
  active = true; // 判断是否重复调用 stop(runner)，`active` = false代表调用了`stop`
  onStop?: () => void;
  public scheduler: Function | undefined;

  constructor(fn, scheduler?: Function) {
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
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}

// 全局对象，存放所有target
const targetMap = new Map();
export function track(target, key) {
  // 我们需要一个容器，存储响应式对象的属性对应的所有依赖，对于target
  // 那么这个对应关系就是： target -> key -> deps
  // 所以我们需要一个Map，存放所有target, 还需要一个map来存放该`target`对应`key`的所有dep
  // 考虑到一个`key`可能有相同依赖，对于`dep`的收集，我们使用Set数据结构

  // if (!activeEffect) return; // 如果只是单纯获取响应式对象的属性，即没有调用`effect`，则无需收集依赖
  // if (!shouldTrack) return; // 如果无需收集依赖(即已经为stop状态)，直接return
  if (!isTracking()) return;
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

export function trackEffects(dep) {
  // 我们需要将fn存入，如何取得？
  // 因为我们是先进行fn的执行，所以我们可以创建一个全局对象，在fn执行时使其指向当前的ReactiveEffect对象，然后在track中即可取得
  if (dep.has(activeEffect)) return;

  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}

// 触发依赖，根据`target`和`key`去除dep表，遍历执行即可
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);
  triggerEffects(dep);
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    // 如果传入`scheduler`，则执行`scheduler`
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      // 没传执行`fn`
      effect.run();
    }
  }
}

// 调用`effect`函数时，执行传入的`fn`
// 创建`ReactiveEffect`对象，传入`fn`
export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  extend(_effect, options);
  // 执行`fn`
  _effect.run();
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

export function stop(runner) {
  // 当调用stop时，将当前的依赖从依赖表中删除
  // runner -> ReactiveEffect实例 -> 实例的stop方法
  // ReactiveEffect -> 该effect对应的依赖表
  runner.effect.stop();
}
