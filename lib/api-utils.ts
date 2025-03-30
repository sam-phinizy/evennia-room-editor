import { Node, Edge, MarkerType } from "reactflow";
import { extractAttributes } from "./flow-transformers";
import { roomApi, exitApi } from "./api-service";

/**
 * Create a room in the API
 */
export const createRoomInApi = async (roomData: {
  name: string;
  description: string;
  attributes?: Record<string, any>;
}) => {
  try {
    const data = await roomApi.createRoom(roomData);
    return data;
  } catch (error) {
    console.error("Error creating room in API:", error);
    throw error;
  }
};

/**
 * Create an exit in the API
 */
export const createExitInApi = async (exitData: {
  name: string;
  description?: string;
  source_id: string;
  destination_id: string;
  attributes?: Record<string, any>;
}) => {
  try {
    const data = await exitApi.createExit(exitData);
    return data;
  } catch (error) {
    console.error("Error creating exit in API:", error);
    throw error;
  }
};

/**
 * Delete a room from the API
 */
export const deleteRoomFromApi = async (roomId: string | number) => {
  try {
    return await roomApi.deleteRoom(roomId);
  } catch (error) {
    console.error(`Error deleting room ${roomId} from API:`, error);
    throw error;
  }
};

/**
 * Delete an exit from the API
 */
export const deleteExitFromApi = async (exitId: string | number) => {
  try {
    return await exitApi.deleteExit(exitId);
  } catch (error) {
    console.error(`Error deleting exit ${exitId} from API:`, error);
    throw error;
  }
};

/**
 * Create a node with data from API
 */
export const createNodeFromApiRoom = (
  room: any,
  position = { x: 0, y: 0 }
): Node => {
  const roomId = room.id.toString();

  return {
    id: roomId,
    type: "custom",
    data: {
      label: room.name || `Room ${room.id}`,
      description: room.attributes?.desc || "",
      api_id: room.id, // Store the API ID
      // Add any other room attributes prefixed with attr_
      ...Object.entries(room.attributes || {}).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [`attr_${key}`]: value,
        }),
        {}
      ),
    },
    position,
  };
};

/**
 * Create an edge with data from API
 */
export const createEdgeFromApiExit = (exit: any): Edge => {
  const edgeId = `e${exit.id}`;
  const sourceId = exit.source_id.toString();
  const targetId = exit.destination_id.toString();

  return {
    id: edgeId,
    source: sourceId,
    target: targetId,
    type: "custom",
    data: {
      label: exit.name || "Exit",
      description: exit.attributes?.desc || "",
      api_id: exit.id, // Store the API ID
      // Add any other exit attributes prefixed with attr_
      ...Object.entries(exit.attributes || {}).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [`attr_${key}`]: value,
        }),
        {}
      ),
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#3b82f6",
    },
  };
};

/**
 * Prepare room data for API from node data
 */
export const prepareRoomDataFromNode = (node: Node) => {
  return {
    name: node.data.label,
    description: node.data.description || "",
    attributes: extractAttributes(node.data),
  };
};

/**
 * Prepare exit data for API from edge data
 */
export const prepareExitDataFromEdge = (
  edge: Edge,
  sourceId: string,
  destId: string
) => {
  return {
    name: edge.data?.label || "Exit",
    description: edge.data?.description || "A path leading to another room",
    source_id: sourceId,
    destination_id: destId,
    attributes: extractAttributes(edge.data || {}),
  };
};
