export const extend = Object.assign;

export const isObject = (val) => {
  return val !== null && typeof val === "object";
};

export const hasChanged = (newVal, oldVal) => {
  return !Object.is(newVal, oldVal);
};

export const isString = (val) => typeof val === "string";

export const hasOwn = (val, key) =>
  Object.prototype.hasOwnProperty.call(val, key);

// 传入add 生成onAdd add-foo -> onAddFoo

export const camelize = (str: string) => {
  return str.replace(/-(\w)/g, (_, c: string) => {
    return c ? c.toUpperCase() : "";
  });
};

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toHandlerKey = (str: string) => {
  return str ? "on" + capitalize(str) : "";
};

export const isEmptyObject = (obj: object) => {
  return Object.keys(obj).length === 0;
};
