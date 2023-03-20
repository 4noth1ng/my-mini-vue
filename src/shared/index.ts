export const extend = Object.assign;

export const isObject = (val) => {
  return val !== null && typeof val === "object";
};

export const hasChanged = (newVal, oldVal) => {
  return !Object.is(newVal, oldVal);
};

export const hasOwn = (val, key) =>
  Object.prototype.hasOwnProperty.call(val, key);
