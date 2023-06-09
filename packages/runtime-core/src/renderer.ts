import { extend } from "@my-mini-vue/shared";
import { createComponentInstance, setupComponent } from "./component";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "@my-mini-vue/reactivity";
import { ShapeFlags } from "@my-mini-vue/shared";
import { shouldUpdateComponent } from "./componentUpdateUtils";
import { isEmptyObject } from "@my-mini-vue/shared";
import { queueJobs } from "./scheduler";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;

  function render(vnode, container, parentComponent) {
    // 调用`patch`方法，处理vnode, 方便后续递归处理

    patch(null, vnode, container, parentComponent);
  }

  function patch(n1, n2, container, parentComponent) {
    try {
      // 处理组件
      // 针对vnode 是 component | element类型进行处理
      const { type, shapeFlag } = n2;

      // Fragment -> 只渲染 children
      switch (type) {
        case Fragment:
          processFragment(n1, n2, container, parentComponent);
          break;
        case Text:
          processText(n1, n2, container);
          break;
        default:
          if (shapeFlag & ShapeFlags.ELEMENT) {
            processElement(n1, n2, container, parentComponent);
          } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            processComponent(n1, n2, container, parentComponent);
          }
          break;
      }
    } catch (error) {}
  }

  function processFragment(n1, vnode, container, parentComponent) {
    mountChildren(vnode.children, container, parentComponent);
  }

  function processText(n1, vnode, container) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processElement(n1, n2, container, parentComponent) {
    if (!n1) {
      // init
      mountElement(n2, container, parentComponent);
    } else {
      // diff
      patchElement(n1, n2, container, parentComponent);
    }
  }

  function patchElement(n1, n2, container, parentComponent) {
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    const el = (n2.el = n1.el);
    console.log(n1, n2);
    patchChildren(n1, n2, el, parentComponent);
    patchProps(el, oldProps, newProps);
  }

  function patchChildren(n1, n2, container, parentComponent) {
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
    const c1 = n1.children;
    const c2 = n2.children;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 新的children 为 TEXT类型
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 1. 如果老的children为ARRAY类型，把老的children清空
        unmountChildren(n1.children);
      }
      if (c1 !== c2) {
        // 2. 设置text
        hostSetElementText(container, c2);
      }
    } else {
      // 新的children为ARRAY类型
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 旧的为TEXT
        hostSetElementText(container, "");
        mountChildren(c2, container, parentComponent);
      } else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 旧的为ARRAY
        patchKeyedChildren(c1, c2, container, parentComponent);
      }
    }
  }

  function patchKeyedChildren(
    oldChildren,
    newChildren,
    container,
    parentComponent
  ) {
    // 1. 处理相同前缀 定义索引j指向新旧两组子节点的开头
    let j = 0;
    let oldVNode = oldChildren[j];
    let newVNode = newChildren[j];
    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container, parentComponent);
      j++;
      oldVNode = oldChildren[j];
      newVNode = newChildren[j];
    }
    // 2. 处理相同后缀，由于新旧两组子节点不同，所以定义两个指针
    let oldEnd = oldChildren.length - 1;
    let newEnd = newChildren.length - 1;

    oldVNode = oldChildren[oldEnd];
    newVNode = newChildren[newEnd];

    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container, parentComponent);
      oldVNode = oldChildren[--oldEnd];
      newVNode = newChildren[--newEnd];
    }

    //3. 处理完前缀后缀，如果新节点数组仍有剩余，则需插入, 如何判断有剩余？ 易得：j > oldEnd说明旧节点处理完毕， j <= newEnd 说明新节点未处理完毕，则当二者符合时，满足条件
    if (j > oldEnd && j <= newEnd) {
      // 将[j, newEnd]内的所有节点插入到 newEnd的后一个节点之前
      const anchorIdx = newEnd + 1;
      const anchor =
        anchorIdx < newChildren.length ? newChildren[anchorIdx].el : null;
      while (j <= newEnd) {
        patch(null, newChildren[j], container, parentComponent);
        hostInsert(newChildren[j++].el, container, anchor);
      }
    }

    // 4. 如果旧节点数组仍有剩余，则需卸载，同上，当 j > newEnd说明新节点处理完毕， 当 j <= oldEnd 说明旧节点未处理完毕
    else if (j > newEnd && j <= oldEnd) {
      // 卸载 [j, oldEnd] 之间的节点
      while (j <= oldEnd) {
        hostRemove(oldChildren[j++].el);
      }
    }

    // 5. 新旧都有剩余
    else {
      // 构建source数组，用于存放新的一组子节点在旧的一组子节点的索引
      const count = newEnd - j + 1; // 需要更新的新节点数量
      const source = Array(count).fill(0);
      source.fill(-1);

      // oldStart 和 newStart 分别为起始索引，即j
      const oldStart = j;
      const newStart = j;

      let moved = false; // 代表是否需要移动节点
      let pos = 0; // 代表遍历旧节点时遇到的最大索引值，当pos呈现递增时，说明无需移动节点

      // 构建索引表, key为新节点VNode的key，value为下标索引值, 用来寻找具有相同key的可复用节点
      const keyIndex = {};
      for (let i = newStart; i <= newEnd; i++) {
        keyIndex[newChildren[i].key] = i;
      }
      // 代表更新过的节点数量
      let patched = 0;
      // 遍历旧的一组子节点中剩余未处理的节点
      for (let i = oldStart; i <= oldEnd; i++) {
        oldVNode = oldChildren[i];
        if (patched <= count) {
          const k = keyIndex[oldVNode.key];

          if (typeof k !== "undefined") {
            // 存在可复用节点
            newVNode = newChildren[k];
            patch(oldVNode, newVNode, container, parentComponent);
            patched++;
            source[k - newStart] = i;
            if (k < pos) {
              // 当前索引比最大索引要小，即在oldChildren中当前newVNode靠前, 需要移动
              moved = true;
            } else {
              pos = k;
            }
          } else {
            // 该旧节点不存在于新节点数组中，则直接卸载
            hostRemove(oldVNode.el);
          }
        } else {
          // patched > count 即新节点已经更新完毕， 剩余旧节点需要进行卸载
          hostRemove(oldVNode.el);
        }
      }
      if (moved) {
        const seq = getSequence(source);
        let s = seq.length; // s 指向递增子序列的最后一个元素
        let i = count - 1; // i + newStart 指向需要更新的新节点序列最后一个元素
        for (i; i >= 0; i--) {
          if (source[i] === -1) {
            // 旧节点数组中不存在该元素，直接进行挂载
            const pos = i + newStart;
            const newVNode = newChildren[pos];
            const nextPos = pos + 1;
            const anchor =
              nextPos < newChildren.length ? newChildren[nextPos].el : null;
            patch(null, newVNode, container, parentComponent);
            hostInsert(newVNode.el, container, anchor);
          } else if (i !== seq[s]) {
            // 当前新节点不属于递增子序列的部分，所以该节点需要进行移动
            const pos = i + newStart;
            const newVNode = newChildren[pos];
            const nextPos = pos + 1;
            // 移动到他在newChildren的后一个节点之前
            const anchor =
              nextPos < newChildren.length ? newChildren[nextPos].el : null;

            hostInsert(newVNode.el, container, anchor);
          } else {
            // 存在于递增子序列中，无需移动, s向前移动
            s--;
          }
        }
      }
    }
  }
  // TODO: 理解最长递增子序列(二分+贪心+前驱)算法
  function getSequence(arr: number[]): number[] {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
      const arrI = arr[i];
      if (arrI !== 0) {
        j = result[result.length - 1];
        if (arr[j] < arrI) {
          p[i] = j;
          result.push(i);
          continue;
        }
        u = 0;
        v = result.length - 1;
        while (u < v) {
          c = (u + v) >> 1;
          if (arr[result[c]] < arrI) {
            u = c + 1;
          } else {
            v = c;
          }
        }
        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1];
          }
          result[u] = i;
        }
      }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
      result[u] = v;
      v = p[v];
    }
    return result;
  }

  // 双端diff - vue2.js
  function patchKeyedChildrenInVue2(
    oldChildren,
    newChildren,
    container,
    parentComponent
  ) {
    // 新旧CHILDREN首尾指针
    let oldStartIdx = 0;
    let oldEndIdx = oldChildren.length - 1;
    let newStartIdx = 0;
    let newEndIdx = newChildren.length - 1;

    // 对应VNode
    let oldStartVNode = oldChildren[oldStartIdx];
    let oldEndVNode = oldChildren[oldEndIdx];
    let newStartVNode = newChildren[newStartIdx];
    let newEndVNode = newChildren[newEndIdx];
    // 新旧Children diff操作
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (!oldStartVNode) {
        oldStartVNode = oldChildren[++oldStartIdx];
      } else if (!oldEndVNode) {
        oldEndVNode = oldChildren[--oldEndIdx];
      } else if (oldStartVNode.key === newStartVNode.key) {
        // 第一步：新旧头节点比较
        patch(oldStartVNode, newStartVNode, container, parentComponent);
        oldStartVNode = oldChildren[++oldStartIdx];
        newStartVNode = newChildren[++newStartIdx];
      } else if (oldEndVNode.key === newEndVNode.key) {
        // 第二步：新旧尾节点比较
        patch(oldEndVNode, newEndVNode, container, parentComponent);
        oldEndVNode = oldChildren[--oldEndIdx];
        newEndVNode = newChildren[--newEndIdx];
      } else if (oldEndVNode.key === newStartVNode.key) {
        // 第三步：旧尾节点与新头节点比较
        patch(oldEndVNode, newStartVNode, container, parentComponent);
        // oldEndVNode 应该移动到 oldStartVNode 前
        const anchor = oldStartVNode.el;
        hostInsert(oldEndVNode.el, container, anchor);
        oldEndVNode = oldChildren[--oldEndIdx];
        newStartVNode = newChildren[++newStartIdx];
      } else if (oldStartVNode.key === newEndVNode.key) {
        // 第四步：旧头节点与新尾节点比较
        patch(oldStartVNode, newEndVNode, container, parentComponent);
        // oldStartVNode 应该移动到 oldEndVNode 后
        const anchor = oldEndVNode.el.nextSibling;
        hostInsert(oldStartVNode.el, container, anchor);
        oldStartVNode = oldChildren[++oldStartIdx];
        newEndVNode = newChildren[--newEndIdx];
      } else {
        // 第五步：前四种都未匹配
        // 遍历OldChildren，寻找与 newStartVNode 具有相同 key的节点, 找到这个节点，就意味着这个节点需要移到当前oldStartVNode之前，找不到，就将它作为新的头节点
        // idxInOld 就是newStartVNode在OldChildren内的索引值
        const idxInOld = oldChildren.findIndex(
          (node) => node && node.key === newStartVNode.key
        ); // 如果没有，会返回 -1

        if (idxInOld > 0) {
          const vnodeToMove = oldChildren[idxInOld];
          // 移动前先递归进行patch
          patch(vnodeToMove, newStartVNode, container, parentComponent);
          // 移到oldStartVNode 之前
          const anchor = oldStartVNode.el;
          hostInsert(vnodeToMove.el, container, anchor);
          // 由于该节点已经被移动，所以此处设为undefined，并在最前增加两个对于oldChildren内undefined节点的判断
          oldChildren[idxInOld] = undefined;
        } else {
          // 旧节点中不存在
          patch(null, newStartVNode, container, parentComponent);
          hostInsert(newStartVNode.el, container, oldStartVNode.el);
        }
        newStartVNode = newChildren[++newStartIdx];
      }
    }

    // 如果newChildren内有遗留的节点，进行添加
    if (oldStartIdx > oldEndIdx && newStartIdx <= newEndIdx) {
      for (let i = newStartIdx; i <= newEndIdx; i++) {
        const anchor = newChildren[newEndIdx + 1]
          ? newChildren[newEndIdx + 1].el
          : null;
        // [newStartIdx, newEndIdx]内为遗留的节点， 按照在 newChildren内的顺序， 我们需要将这些节点全部插入到newChildren[newEndIdx + 1]前
        // 如果newChildren[newEndIdx + 1]不存在, 说明全部插入至结尾
        patch(null, newChildren[i], container, parentComponent);
        hostInsert(newChildren[i].el, container, anchor);
      }
    }

    // 如果oldChildren内有遗留的节点，进行删除
    if (newStartIdx > newEndIdx && oldStartIdx <= oldEndIdx) {
      for (let i = oldStartIdx; i <= oldEndIdx; i++) {
        hostRemove(oldChildren[i].el);
      }
    }
  }

  function isSameVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key;
  }

  function unmountChildren(children) {
    for (const child of children) {
      const el = child.el;
      // remove
      hostRemove(el);
    }
  }

  function patchProps(el, oldProps, newProps) {
    if (isEmptyObject(oldProps) && isEmptyObject(newProps)) return;
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];

        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }
      for (const key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null);
        }
      }
    }
  }

  function mountElement(vnode, container, parentComponent) {
    const el = (vnode.el = hostCreateElement(vnode.type));
    // 判断 vnode.children 类型，如果是string, 直接赋值即可, 如果是数组，则为vnode类型，就继续调用patch处理, 且挂载的容器即为上面的el
    const { children, props, shapeFlag } = vnode;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent);
    }
    // 判断是否是注册事件
    for (const key in props) {
      const val = props[key];
      // on + Event name

      hostPatchProp(el, key, null, val);
    }
    // container.append(el);
    hostInsert(el, container);
  }

  function mountChildren(children, container, parentComponent) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  function processComponent(n1, initialVNode, container, parentComponent) {
    if (!n1) {
      // 挂载组件
      mountComponent(initialVNode, container, parentComponent);
    } else {
      // 更新组件
      updateComponent(n1, initialVNode);
    }
    // mountComponent(initialVNode, container, parentComponent);
  }

  function updateComponent(n1, n2) {
    debugger;
    const instance = (n2.component = n1.component);
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;
      instance.update();
    } else {
      n2.el = n1.el;
      instance.vnode = n2;
    }
  }
  function mountComponent(initialVNode, container, parentComponent) {
    // 创建组件实例, 用于挂载`props`，`slots`等
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ));

    // 处理组件, 挂载属性
    setupComponent(instance);

    // 调用render函数，得到渲染的虚拟节点
    setupRenderEffect(instance, initialVNode, container);
  }

  function setupRenderEffect(instance, initialVNode, container) {
    /**
     * 我们需要在虚拟节点更新时触发`render`，如何实现？将render作为依赖传入effect进行收集, 当响应式对象改变时，依赖会被触发重新render
     */
    // 存储runner
    instance.update = effect(
      () => {
        if (!instance.isMounted) {
          // 第一次挂载时，渲染全部

          // 虚拟节点树
          // 将 component类型的vnode初始化为组件实例instance后，调用`render`，进行拆箱，得到该组件对应的虚拟节点
          // 比如根组件得到的就为根虚拟节点

          const { proxy } = instance;
          // 将render的this绑定到proxy上，render内获取this上属性时会被proxy拦截
          // 由于render函数编译后直接获取第一个参数_ctx上的属性，所以将proxy传入
          const subTree = (instance.subTree = instance.render.call(
            proxy,
            proxy
          ));

          // vnode -> patch
          // element类型 vnode -> element -> mountElement

          // 得到虚拟节点树，再次调用patch, 将vnode分为element类型(vnode.type为类似'div'的string)和component类型(vnode.type需初始化为instance)进行处理拆箱, 并挂载
          patch(null, subTree, container, instance);
          // element 全部挂载后， 获取的el一定是赋值后的
          // 注意：`$el`获取的是组件实例的根dom节点，我们获取的subTree是调用render后生成的dom树，获取的自然是root， 然后我们将这个dom树挂载到 app上
          initialVNode.el = subTree.el;

          instance.isMounted = true;
        } else {
          const { next, vnode } = instance;
          if (next) {
            next.el = vnode.el;
            updateComponentPreRender(instance, next);
          }

          // 进行diff判断，最小化更新
          const { proxy } = instance;
          const subTree = instance.render.call(proxy, proxy);
          // 旧vnode树
          const prevSubTree = instance.subTree;
          patch(prevSubTree, subTree, container, instance); // 更新children

          // 还需要更新props

          instance.subTree = subTree;
        }
      },
      {
        scheduler() {
          queueJobs(instance.update);
        },
      }
    );
  }

  return {
    createApp: createAppAPI(render),
  };
}

function updateComponentPreRender(instance, nextVNode) {
  instance.vnode = nextVNode;
  instance.next = null;

  instance.props = nextVNode.props;
}
