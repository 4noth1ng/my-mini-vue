import { NodeTypes } from "./ast";

export function transform(root, options) {
  const context = createTransformContext(root, options);
  // 1. 遍历 - 深度优先搜索
  traverseNode(root, context);
}

function createTransformContext(root, options) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
  };

  return context;
}

function traverseNode(node, context) {
  const nodeTransforms = context.nodeTransforms;
  for (const transform of nodeTransforms) {
    transform(node);
  }
  traverseChildren(node, context);
}

function traverseChildren(node: any, context: any) {
  const children = node.children;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      traverseNode(node, context);
    }
  }
}
