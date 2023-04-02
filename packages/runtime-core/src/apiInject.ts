import { getCurrentInstance } from "./component";
export function provide(key, value) {
  // 存
  const currentInstance: any = getCurrentInstance();
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

export function inject(key, defaultVal) {
  const currentInstance: any = getCurrentInstance();

  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides;
    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultVal) {
      if (typeof defaultVal === "function") return defaultVal();
      else return defaultVal;
    }
  }
}
