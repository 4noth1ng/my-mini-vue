import { camelize, toHandlerKey } from "@my-mini-vue/shared";

export function emit(instance, event, ...args) {
  // 用户调用emit时只传递事件名和参数， 如何获取instance？ 可在绑定时使用bind(null, args)传递component，确定arg0

  // instance.props -> event
  const { props } = instance;

  const handlerName = toHandlerKey(camelize(event));
  //   console.log(handler);
  const handler = props[handlerName];
  handler && handler(...args);
}
