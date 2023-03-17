export const extend = Object.assign;

export const isObject = (val) => {
  return val !== null && typeof val === "object";
};

export const hasChanged = (newVal, oldVal) => {
  return !Object.is(newVal, oldVal);
};
