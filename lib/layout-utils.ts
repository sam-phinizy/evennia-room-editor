import { Node, Edge } from "reactflow";

interface NodePosition {
  x: number;
  y: number;
}

interface GraphConnections {
  [nodeId: string]: string[];
}

/**
 * Calculate automatic layout for nodes and edges
 */
export const calculateAutoLayout = (
  allNodes: Node[],
  allEdges: Edge[],
  startNodeId?: string
): { nodePositions: Record<string, NodePosition>; enhancedEdges: Edge[] } => {
  const nodePositions: Record<string, NodePosition> = {};

  // Create a basic graph representation to find root nodes
  const graphIn: GraphConnections = {};
  const graphOut: GraphConnections = {};

  // Initialize empty arrays for each node
  allNodes.forEach((node) => {
    graphIn[node.id] = [];
    graphOut[node.id] = [];

    // Store existing node positions
    nodePositions[node.id] = node.position;
  });

  // Fill in graph connections
  allEdges.forEach((edge) => {
    graphOut[edge.source].push(edge.target);
    graphIn[edge.target].push(edge.source);
  });

  // Find root nodes (nodes with no incoming edges or specified start node)
  const rootNodeIds: string[] = [];

  if (startNodeId && allNodes.some((node) => node.id === startNodeId)) {
    // If a start node is specified and exists, use it
    rootNodeIds.push(startNodeId);
  } else {
    // Otherwise find nodes without incoming connections
    allNodes.forEach((node) => {
      if (graphIn[node.id].length === 0) {
        rootNodeIds.push(node.id);
      }
    });

    // If no root nodes found (circular graph), just pick the first node
    if (rootNodeIds.length === 0 && allNodes.length > 0) {
      rootNodeIds.push(allNodes[0].id);
    }
  }

  // Width and height settings for layout
  const horizontalSpacing = 300;
  const verticalSpacing = 200;

  // Process root nodes
  rootNodeIds.forEach((nodeId, index) => {
    // Position root nodes horizontally spaced
    nodePositions[nodeId] = {
      x: index * horizontalSpacing,
      y: 100,
    };
  });

  // Use BFS to position connected nodes
  const positionedIds = new Set(rootNodeIds);
  const queue = [...rootNodeIds];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (!nodePositions[currentId]) continue;

    // Process children (connected nodes)
    const children =
      graphOut[currentId]?.filter((id) => !positionedIds.has(id)) || [];

    if (children.length > 0) {
      // Position children in a semicircle below the parent
      const parentPos = nodePositions[currentId];

      children.forEach((childId, index) => {
        const angle = (Math.PI / (children.length + 1)) * (index + 1);
        const x = parentPos.x + (horizontalSpacing / 2) * Math.cos(angle);
        const y = parentPos.y + verticalSpacing * Math.sin(angle);

        nodePositions[childId] = { x, y };
        positionedIds.add(childId);
        queue.push(childId);
      });
    }
  }

  // Position any remaining nodes that weren't placed by BFS
  allNodes
    .filter((node) => !positionedIds.has(node.id))
    .forEach((node, index) => {
      // Find empty space for these nodes
      const maxX = Math.max(...Object.values(nodePositions).map((p) => p.x), 0);
      const maxY = Math.max(...Object.values(nodePositions).map((p) => p.y), 0);

      nodePositions[node.id] = {
        x: maxX + horizontalSpacing,
        y: 100 + index * verticalSpacing,
      };
    });

  // Determine optimal edge handles
  const enhancedEdges = allEdges.map((edge) => {
    const sourcePos = nodePositions[edge.source];
    const targetPos = nodePositions[edge.target];

    if (sourcePos && targetPos) {
      // Determine direction based on relative positions
      const xDiff = targetPos.x - sourcePos.x;
      const yDiff = targetPos.y - sourcePos.y;

      let sourceHandle, targetHandle;

      // Check if there's a reverse edge (bidirectional connection)
      const hasReverseEdge = allEdges.some(
        (e) => e.source === edge.target && e.target === edge.source
      );

      // For horizontal layouts
      if (Math.abs(xDiff) >= Math.abs(yDiff)) {
        if (xDiff > 0) {
          // Target is to the right
          sourceHandle = "right-source";
          targetHandle = "left-target";
        } else {
          // Target is to the left
          sourceHandle = "left-source";
          targetHandle = "right-target";
        }

        // For bidirectional edges, offset one slightly to avoid overlap
        if (hasReverseEdge && edge.source > edge.target) {
          // This is the "return" edge, offset it
          if (yDiff >= 0) {
            sourceHandle = "top-source";
            targetHandle = "top-target";
          } else {
            sourceHandle = "bottom-source";
            targetHandle = "bottom-target";
          }
        }
      }
      // For vertical layouts
      else {
        if (yDiff > 0) {
          // Target is below
          sourceHandle = "bottom-source";
          targetHandle = "top-target";
        } else {
          // Target is above
          sourceHandle = "top-source";
          targetHandle = "bottom-target";
        }

        // For bidirectional edges, offset one slightly to avoid overlap
        if (hasReverseEdge && edge.source > edge.target) {
          // This is the "return" edge, offset it
          if (xDiff >= 0) {
            sourceHandle = "right-source";
            targetHandle = "right-target";
          } else {
            sourceHandle = "left-source";
            targetHandle = "left-target";
          }
        }
      }

      return {
        ...edge,
        sourceHandle,
        targetHandle,
      };
    }

    return edge;
  });

  return { nodePositions, enhancedEdges };
};
