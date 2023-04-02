import { isRef, proxyRefs, ref, unRef } from "../src/ref";
import { effect } from "../src/effect";
import { reactive } from "../src/reactive";

describe("ref", () => {
  it("happy path", () => {
    const a = ref(1);
    expect(a.value).toBe(1);
  });

  it("should be reactive", () => {
    const a = ref(1);
    let dummy;
    let calls = 0;
    effect(() => {
      calls++;
      dummy = a.value;
    });
    expect(calls).toBe(1);
    expect(dummy).toBe(1);
    a.value = 2;
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
    // 值未改变 则无需再次触发依赖
    a.value = 2;
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
  });

  it("should make nested properties reactive", () => {
    const a = ref({
      count: 1,
    });
    let dummy;
    effect(() => {
      dummy = a.value.count;
    });
    expect(dummy).toBe(1);
    a.value.count = 2;
    expect(dummy).toBe(2);
  });
  it("isRef", () => {
    const a = ref(1);
    const user = reactive({
      age: 1,
    });
    expect(isRef(a)).toBe(true);
    expect(isRef(1)).toBe(false);
    expect(isRef(user)).toBe(false);
  });
  it("unRef", () => {
    const a = ref(1);
    const user = reactive({
      age: 1,
    });
    expect(unRef(a)).toBe(1);
    expect(unRef(1)).toBe(1);
  });
  it("proxyRefs", () => {
    const user = {
      age: ref(10),
      name: "czc",
    };

    const proxyUser = proxyRefs(user);
    expect(user.age.value).toBe(10);
    expect(proxyUser.name).toBe("czc");

    proxyUser.age = 20;
    // 如果赋值的不是`ref`，那么我们需要对原有属性的ref进行赋值
    expect(proxyUser.age).toBe(20);
    expect(user.age.value).toBe(20);

    proxyUser.age = ref(10);
    expect(proxyUser.age).toBe(10);
    expect(user.age.value).toBe(10);
  });
});
