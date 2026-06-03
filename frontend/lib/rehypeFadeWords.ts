interface HNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HNode[];
  properties?: Record<string, unknown>;
}

function walk(node: HNode): void {
  if (!node.children) return;
  if (node.tagName === "code" || node.tagName === "pre") return;

  const next: HNode[] = [];

  for (const child of node.children) {
    if (child.type === "text" && child.value) {
      for (const part of child.value.split(/(\s+)/)) {
        if (part.length === 0) continue;
        if (/^\s+$/.test(part)) {
          next.push({ type: "text", value: part });
        } else {
          next.push({
            type: "element",
            tagName: "span",
            properties: { className: ["fade-word"] },
            children: [{ type: "text", value: part }],
          });
        }
      }
    } else {
      walk(child);
      next.push(child);
    }
  }

  node.children = next;
}

export function rehypeFadeWords() {
  return (tree: HNode) => {
    walk(tree);
  };
}
