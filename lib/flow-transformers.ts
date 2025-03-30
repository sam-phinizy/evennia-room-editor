import { Node, Edge } from "reactflow";
import { AttributeSchemaItem } from "@/components/attribute-schema-modal";

/**
 * Utility function to apply schema attributes to node data
 */
export const applySchemaToNodeData = (
  nodeData: { [key: string]: any },
  schema: AttributeSchemaItem[]
) => {
  schema.forEach((item: AttributeSchemaItem) => {
    // Only apply if the attribute doesn't already exist
    if (!(`attr_${item.name}` in nodeData)) {
      if (item.default !== undefined) {
        nodeData[`attr_${item.name}`] = item.default;
      } else {
        // Add empty attribute based on type
        if (item.type === "string") nodeData[`attr_${item.name}`] = "";
        if (item.type === "int") nodeData[`attr_${item.name}`] = 0;
        if (item.type === "float") nodeData[`attr_${item.name}`] = 0.0;
        if (item.type === "boolean") nodeData[`attr_${item.name}`] = false;
      }
    }
  });
  return nodeData;
};

/**
 * Helper function to get edge color based on label
 */
export const getEdgeColorByLabel = (label: string) => {
  switch (label.toLowerCase()) {
    case "connects to":
      return "#3b82f6"; // blue
    case "depends on":
      return "#ef4444"; // red
    case "references":
      return "#10b981"; // green
    default:
      return "#888"; // default gray
  }
};

/**
 * Simplify nodes for export
 */
export const simplifyNodes = (nodes: Node[]) => {
  return nodes.map((node) => {
    // Extract attributes (keys starting with attr_)
    const attributes = Object.entries(node.data)
      .filter(([key]) => key.startsWith("attr_"))
      .reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key.replace("attr_", "")]: value,
        }),
        {}
      );

    return {
      id: node.id,
      name: node.data.label,
      description: node.data.description,
      attributes: attributes,
    };
  });
};

/**
 * Simplify edges for export
 */
export const simplifyEdges = (edges: Edge[]) => {
  return edges.map((edge) => {
    // Extract attributes (keys starting with attr_)
    const attributes = Object.entries(edge.data || {})
      .filter(([key]) => key.startsWith("attr_"))
      .reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key.replace("attr_", "")]: value,
        }),
        {}
      );

    return {
      from: edge.source,
      to: edge.target,
      relationship: edge.data?.label,
      description: edge.data?.description,
      attributes: attributes,
    };
  });
};

/**
 * Extract attributes from node or edge data
 */
export const extractAttributes = (data: { [key: string]: any }) => {
  return Object.entries(data || {})
    .filter(([key]) => key.startsWith("attr_"))
    .reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key.replace("attr_", "")]: String(value),
      }),
      {}
    );
};
