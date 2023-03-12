import { effect } from "../effect";
import { reactive } from "../reactive";

describe("effect", () => {
  it("happy path", () => {
    const user = reactive({
      age: 10,
    });
    // user是一个响应式对象, 其内部存在一个容器，通过`effect`函数收集依赖
    // `effect`内部接收一个函数参数`fn`，一开始会执行`fn`，触发响应式对象的get
    // 触发get后，响应式对象会执行`依赖收集`操作，即 将fn放入其对应容器中
    let nextAge;
    effect(() => {
      nextAge = user.age + 1;
    });
    // 当我们修改响应式对象的值时，触发其`set`操作
    // 响应式对象则会将依赖取出，即执行上述的`fn`，这称为触发依赖
    expect(nextAge).toBe(11);
    user.age++;
    expect(nextAge).toBe(12);
  });

  it("should return runner when call effect", () => {
    let foo = 10;
    const runner = effect(() => {
      foo++;
      return "foo";
    });
    expect(foo).toBe(11);
    const r = runner();
    expect(foo).toBe(12);
    expect(r).toBe("foo");
  });
});
