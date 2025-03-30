import { Node, Edge } from "reactflow";
import { calculateAutoLayout } from "./layout-utils";
import { roomApi } from "./api-service";
import { createNodeFromApiRoom, createEdgeFromApiExit } from "./api-utils";
import { toast } from "@/components/ui/use-toast";

/**
 * Load rooms from API and position them automatically
 */
export const loadRoomsFromApi = async (
  startRoomId: number,
  depth: number,
  existingNodes: Node[],
  existingEdges: Edge[]
) => {
  try {
    // Get existing node and edge IDs to avoid duplicates
    const existingNodeIds = new Set(existingNodes.map((node) => node.id));
    const existingEdgeIds = new Set(existingEdges.map((edge) => edge.id));

    // Fetch room graph from API
    const data = await roomApi.readRoomGraph(startRoomId, depth);

    // Validate response data structure
    if (!data || !data.rooms || !data.exits) {
      throw new Error("Invalid response format from server");
    }

    if (Object.keys(data.rooms).length === 0) {
      return {
        newNodes: [],
        newEdges: [],
        message: `No rooms found with ID ${startRoomId}`,
      };
    }

    // Process rooms and exits to create nodes and edges
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Add rooms as nodes
    Object.values(data.rooms).forEach((room: any) => {
      try {
        const roomId = room.id.toString();

        // Skip if this room already exists
        if (existingNodeIds.has(roomId)) {
          return;
        }

        // Create a new node with temporary position
        const roomNode = createNodeFromApiRoom(room, {
          x: Math.random() * 800,
          y: Math.random() * 600,
        });

        newNodes.push(roomNode);
        existingNodeIds.add(roomId); // Add to existing set to track
      } catch (err) {
        console.error("Error processing room:", err, room);
      }
    });

    // Add exits as edges
    Object.values(data.exits).forEach((exit: any) => {
      try {
        const edgeId = `e${exit.id}`;

        // Skip if this exit already exists
        if (existingEdgeIds.has(edgeId)) {
          return;
        }

        const sourceId = exit.source_id.toString();
        const targetId = exit.destination_id.toString();

        // Check if both source and target rooms exist (either in existing nodes or new nodes)
        const sourceExists = existingNodeIds.has(sourceId);
        const targetExists = existingNodeIds.has(targetId);

        if (!sourceExists || !targetExists) {
          console.warn(
            `Skipping exit ${exit.id}: Missing source or target room`
          );
          return;
        }

        // Create edge initially without handles - we'll set them during layout
        const newEdge = createEdgeFromApiExit(exit);
        newEdges.push(newEdge);
        existingEdgeIds.add(edgeId); // Add to existing set to track
      } catch (err) {
        console.error("Error processing exit:", err, exit);
      }
    });

    if (newNodes.length === 0 && newEdges.length === 0) {
      return {
        newNodes: [],
        newEdges: [],
        message: "All rooms and exits already exist in the diagram",
      };
    }

    // Create a combined set of all nodes and edges for layout calculation
    const allNodes = [...existingNodes, ...newNodes];
    const allEdges = [...existingEdges, ...newEdges];

    // Calculate automatic layout
    const { nodePositions, enhancedEdges } = calculateAutoLayout(
      allNodes,
      allEdges,
      startRoomId.toString()
    );

    // Apply calculated positions to new nodes
    const positionedNewNodes = newNodes.map((node) => ({
      ...node,
      position: nodePositions[node.id],
    }));

    // Find the enhanced versions of the new edges
    const enhancedNewEdges = enhancedEdges.filter((edge) =>
      newEdges.some((e) => e.id === edge.id)
    );

    return {
      newNodes: positionedNewNodes,
      newEdges: enhancedNewEdges,
      message: `Added ${positionedNewNodes.length} new rooms and ${enhancedNewEdges.length} new exits`,
    };
  } catch (error) {
    console.error("Error loading rooms:", error);
    throw error;
  }
};
