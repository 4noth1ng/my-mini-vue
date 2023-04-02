// 响应式数据更新 -> 触发scheduler -> 第一次进入 isFlushing 为 false, 创建微任务，关闭创建微任务入口
// 每次调用，不断将runner添加进queue中
// 同步任务执行完毕后，微任务取出，遍历queue执行runner，清空queue

const queue: Set<any> = new Set();
// const queue: any[] = [];
let isFlushing = false; // 是否正在进行刷新队列
const p = Promise.resolve();

export function nextTick(fn) {
  return fn ? Promise.resolve().then(fn) : Promise.resolve();
}

export function queueJobs(job) {
  queue.add(job); // 将runner添加
  if (!isFlushing) {
    isFlushing = true;
    p.then(() => {
      try {
        queue.forEach((job: any) => job());
      } finally {
        isFlushing = false;
        queue.clear();
      }
    });
  }
}
