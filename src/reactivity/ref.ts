import { trackEffects, triggerEffects, isTracking } from "./effect";
import { hasChanged, isObject } from "../shared/index";
import { reactive } from "./reactive";

/**
 * `ref`存在的意义在于当需要对基本数据类型进行响应式处理时，proxy无法拦截(只针对对象)
 * 所以我们创建一个类，将基本数据类型作为`RefImpl`的一个`key`的值，然后通过`get`和`set`即可进行拦截
 *
 */

class RefImpl {
  private _value: any;
  public dep;
  private _rawValue: any;
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
  return isObject(value) ? reactive(value) : value;
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function ref(value) {
  return new RefImpl(value);
}

export function isRef(ref) {
  return ref instanceof RefImpl;
}

export function unRef(ref) {
  return isRef(ref) ? ref._value : ref;
}

export function proxyRefs(objectWithRefs) {
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
      } else {
        return Reflect.set(target, key, value);
      }
    },
  });
}
