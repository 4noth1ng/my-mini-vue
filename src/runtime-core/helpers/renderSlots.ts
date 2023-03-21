import { createVNode } from "../vnode";
export function renderSlots(slots, name, props) {
  const slot = slots[name];
  if (slot) {
    if (typeof slot === "function") {
      // 形如：header: (age) => h("div", {}, "header" + age)
      return createVNode("div", {}, slot(props));
    }
  }
}
