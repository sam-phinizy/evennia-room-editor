import { Node, Edge } from "reactflow";
import { simplifyNodes, simplifyEdges } from "./flow-transformers";
import { convertJsonToEvenniaBatchCode } from "./batchCodeConverter";

/**
 * Download full diagram data as JSON
 */
export const downloadFullDiagram = (nodes: Node[], edges: Edge[]): void => {
  try {
    const data = {
      nodes,
      edges,
    };
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, "flow-diagram.json", "application/json");
  } catch (error) {
    console.error("Error downloading diagram:", error);
  }
};

/**
 * Download simplified diagram data as JSON
 */
export const downloadSimplifiedDiagram = (
  nodes: Node[],
  edges: Edge[]
): void => {
  try {
    const simplifiedNodes = simplifyNodes(nodes);
    const simplifiedEdges = simplifyEdges(edges);

    const data = {
      nodes: simplifiedNodes,
      relationships: simplifiedEdges,
    };

    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, "flow-diagram-simple.json", "application/json");
  } catch (error) {
    console.error("Error downloading simplified diagram:", error);
  }
};

/**
 * Download diagram as Evennia batch code
 */
export const downloadEvenniaBatchCode = (
  nodes: Node[],
  edges: Edge[]
): void => {
  try {
    const simplifiedNodes = simplifyNodes(nodes);
    const simplifiedEdges = simplifyEdges(edges);

    const data = {
      nodes: simplifiedNodes,
      relationships: simplifiedEdges,
    };

    // Convert to Evennia batch code
    const batchCode = convertJsonToEvenniaBatchCode(data);

    // Download the batch code as a .py file
    downloadFile(batchCode, "flow-diagram.py", "text/plain");
  } catch (error) {
    console.error("Error downloading Evennia batch code:", error);
  }
};

/**
 * Helper function to download a file
 */
const downloadFile = (
  content: string,
  filename: string,
  contentType: string
): void => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
