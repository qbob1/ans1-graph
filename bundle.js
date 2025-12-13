const calculateNodeSize = (value) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return {
    width: Math.min(300, 8 * text.length + 20),
    // simple width calculation
    height: 20 + Math.floor(text.length / 20) * 10,
    // simple height calculation
  };
};
export const parser = (json) => {
  debugger;
  let jsonObj = json;
  // try {
  //   jsonObj = JSON.parse(json);
  // } catch {
  //   return { nodes: [], edges: [] };
  // }
  const nodes = [];
  const edges = [];
  let nodeId = 1;
  let edgeId = 1;
  function traverse(obj, parentId, parentKey = null) {
    const id = String(nodeId++);
    const type = Array.isArray(obj)
      ? "array"
      : typeof obj === "object" && obj !== null
      ? "object"
      : typeof obj;
    const text = [];
    if (parentId) {
      edges.push({
        id: String(edgeId++),
        from: parentId,
        to: id,
        text: parentKey,
      });
    }
    if (type === "array") {
      obj.forEach((child, idx) => {
        traverse(child, id, null);
      });
      text.push({
        key: parentKey,
        value: `[${obj.length} items]`,
        type,
        childrenCount: obj.length,
      });
    } else if (type === "object") {
      Object.entries(obj).forEach(([key, value]) => {
        const childId = traverse(value, id, key);
        text.push({
          key,
          value,
          type: typeof value === "object" ? typeof value : value,
          to: [childId],
        });
      });
    } else {
      text.push({ key: parentKey, value: obj, type });
    }
    const { width, height } = calculateNodeSize(
      text.length === 1 && text[0].key === null ? text[0].value : text
    );
    nodes.push({
      id,
      text: text.length === 1 && text[0].key === null ? text[0].value : text,
      width,
      height,
      path: parentKey ? [parentKey] : [],
      parentKey,
      parentType: type,
    });
    return id;
  }
  traverse(jsonObj);
  return { nodes, edges };
};
