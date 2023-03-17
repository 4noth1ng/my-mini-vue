import { ReactiveEffect } from "./effect";
class ComputedRefImpl {
  private _getter: any;
  private _dirty: boolean = true;
  private _value: any;
  private _effect: any;
  constructor(getter) {
    this._getter = getter;
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) this._dirty = true;
    });
  }

  get value() {
    // computed取值时，通过get对其进行一个拦截
    /**
     * 何时需要调用`getter`?
     * 1. 第一次触发`get` 2. 依赖响应式对象的值改变后
     * 如何知道依赖的响应式值发生改变？ 通过引入effect
     * 流程：
     * 1. 第一次进入，通过调用effect上的`run`函数实现`getter`的调用，完成赋值操作，并关闭调用`getter`的开关，达到缓存效果
     * 2. 当依赖变化时，由于trigger, 我们传入的scheduler被触发，`getter`触发的通道重新被打开
     * 3. 再次访问computed对象，触发get value()拦截，再次调用`getter`完成赋值操作，并关闭调用`getter`的开关。
     */
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    return this._value;
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter);
}
