import { track, trigger } from "./effect";
import { readonlyHandlers, mutableHandlers } from "./baseHandlers";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

export function reactive(raw) {
  return createActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
}

export function isReactive(value) {
  // 传入的判断的对象
  // 只有`reactive`和`readonly`两种情况 -> `isReadonly`在创建get对象时判断
  // 即通过触发get，在get中返回一个值判断其属性
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}

function createActiveObject(raw, baseHandlers) {
  return new Proxy(raw, baseHandlers);
}
