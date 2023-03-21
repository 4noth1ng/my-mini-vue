export function initSlots(instance, children) {
  normalizeObjectValue(children, instance.slots);
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
    slots[key] = normalizeSlotValue(value);
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value];
}
