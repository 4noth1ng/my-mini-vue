import { NodeTypes } from "./ast";
export const enum TagType {
  Start,
  End,
}
export function baseParse(content: string) {
  const context = createParserContext(content);

  return createRoot(parseChildren(context));
}

function parseChildren(context) {
  const nodes: any[] = [];
  let node;
  const s = context.source;
  if (s.startsWith("{{")) {
    node = parseInterpolation(context);
  } else if (s[0] === "<") {
    if (/[a-z]/i.test(s[1])) {
      node = parseElement(context);
    }
  }

  if (!node) {
    node = parseText(context);
  }

  nodes.push(node);
  return nodes;
}

function parseText(context) {
  const content = parseTextData(context);

  advanceBy(context, content.length);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context) {
  return context.source.slice(0, context.source.length);
}

function parseElement(context) {
  const element = parseTag(context, TagType.Start);

  parseTag(context, TagType.End);
  console.log("__________", context.source);

  return element;
}

function parseTag(context: any, type: TagType) {
  // 1. 解析tag
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  // console.log(match);  [ '<div', 'div', index: 0, input: '<div></div>', groups: undefined ]
  const tag = match[1];

  // 2. 删除处理完成的代码
  advanceBy(context, match[0].length);
  advanceBy(context, 1);
  // console.log(context.source);
  if (type === TagType.End) return;
  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
}

function parseInterpolation(context) {
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );

  advanceBy(context, openDelimiter.length);

  const rawContentLength = closeIndex - openDelimiter.length;

  const rawContent = context.source.slice(0, rawContentLength);

  const content = rawContent.trim();

  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  };
}

function advanceBy(context, length) {
  return (context.source = context.source.slice(length));
}

function createRoot(children) {
  return {
    children,
  };
}

function createParserContext(content: string): any {
  return {
    source: content,
  };
}
