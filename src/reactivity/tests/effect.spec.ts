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
    // 调用`effect`时，会返回一个函数`runner`, 调用`runner`会再次执行传入`effect`的`fn`
    // 同时`fn`会返回一个执行的结果
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

  it("scheduler", () => {
    // 1. 通过`effect`的第二个参数给定的 一个scheduler
    // 2. `effect`第一次执行时，还会执行`fn`
    // 3. 当 改变响应式对象的值，即触发set时，不会执行`fn`，而是执行 scheduler
    // 4. `runner`保存了`fn`，所以调用`runner`就会再次执行`fn`
    let dummy;
    let run: any;
    const scheduler = jest.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      {
        scheduler,
      }
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);
    run();
    expect(dummy).toBe(2);
  });
});
