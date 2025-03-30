import axios from "axios";

// Define a function to get the API URL from localStorage
const getApiUrl = (): string => {
  if (typeof window === "undefined") return "";

  try {
    const savedUrl = localStorage.getItem("flow-diagram-server-url");
    return savedUrl || "";
  } catch (error) {
    console.error("Error accessing localStorage:", error);
    return "";
  }
};

// API client factory function that creates a client with the current URL
const createApiClient = () => {
  const baseURL = getApiUrl();

  return axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
};

// Check if server is connected and enabled
const isServerConnected = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const url = getApiUrl();
    const enabled = localStorage.getItem("flow-diagram-server-enabled");

    // Must have both a valid URL and be enabled
    return url.trim() !== "" && enabled === "true";
  } catch (error) {
    console.error("Error checking server connection status:", error);
    return false;
  }
};

// Define interfaces for API data
export interface RoomData {
  name: string;
  description: string;
  attributes?: Record<string, any>;
}

export interface UpdateRoomData extends RoomData {
  id: string | number;
}

export interface ExitData {
  name: string;
  description?: string;
  source_id: string;
  destination_id: string;
  attributes?: Record<string, any>;
}

export interface UpdateExitData {
  id: string | number;
  name: string;
  description?: string;
  attributes?: Record<string, any>;
}

export interface RoomNamesEntry {
  id: number;
  name: string;
}

export interface RoomResponse {
  id: number;
  name: string;
  description: string;
  attributes?: Record<string, any>;
}

export interface ExitResponse {
  id: number;
  name: string;
  description: string;
  source_id: number;
  destination_id: number;
  attributes?: Record<string, any>;
}

export interface RoomGraphResponse {
  rooms: Record<string, RoomResponse>;
  exits: Record<string, ExitResponse>;
}

// Room API functions
export const roomApi = {
  // Create a room
  createRoom: async (roomData: RoomData): Promise<RoomResponse> => {
    try {
      const apiClient = createApiClient();
      const response = await apiClient.post<RoomResponse>("/room", roomData);
      return response.data;
    } catch (error) {
      console.error("Error creating room:", error);
      throw error;
    }
  },

  // Get room names
  getRoomNames: async (): Promise<RoomNamesEntry[]> => {
    if (!isServerConnected()) {
      return []; // Return empty array if not connected
    }

    try {
      const apiClient = createApiClient();
      const response = await apiClient.get<RoomNamesEntry[]>("/rooms/names");
      return response.data;
    } catch (error) {
      console.error("Error getting room names:", error);
      throw error;
    }
  },

  // Delete a room
  deleteRoom: async (roomId: string | number): Promise<boolean> => {
    if (!isServerConnected()) {
      // If not connected, pretend it was successful
      return true;
    }

    try {
      const apiClient = createApiClient();
      await apiClient.delete(`/room/${roomId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting room ${roomId}:`, error);
      throw error;
    }
  },

  // read room graph
  readRoomGraph: async (
    startRoomId: number,
    depth: number
  ): Promise<RoomGraphResponse> => {
    if (!isServerConnected()) {
      // If not connected, return empty data
      return { rooms: {}, exits: {} };
    }

    try {
      const apiClient = createApiClient();
      const response = await apiClient.get<RoomGraphResponse>(`/room_graph`, {
        params: {
          start_room_id: startRoomId,
          depth: depth,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching room graph:", error);
      throw error;
    }
  },

  // Update a room
  updateRoom: async (roomData: UpdateRoomData): Promise<RoomResponse> => {
    if (!isServerConnected()) {
      // If not connected, create a mock response
      return {
        id:
          typeof roomData.id === "string" ? parseInt(roomData.id) : roomData.id,
        name: roomData.name,
        description: roomData.description,
        attributes: roomData.attributes,
      };
    }

    try {
      const apiClient = createApiClient();
      const response = await apiClient.post<RoomResponse>(
        `/room/${roomData.id}`,
        {
          name: roomData.name,
          description: roomData.description,
          attributes: roomData.attributes,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating room ${roomData.id}:`, error);
      throw error;
    }
  },
};

// Exit API functions
export const exitApi = {
  // Create an exit
  createExit: async (exitData: ExitData): Promise<ExitResponse> => {
    if (!isServerConnected()) {
      // If not connected, create a mock response with a local ID
      return {
        id: Math.floor(Math.random() * -1000) - 1, // Use negative numbers for local IDs
        name: exitData.name,
        description: exitData.description || "",
        source_id: parseInt(exitData.source_id),
        destination_id: parseInt(exitData.destination_id),
        attributes: exitData.attributes,
      };
    }

    try {
      const apiClient = createApiClient();
      const response = await apiClient.post<ExitResponse>("/exit", exitData);
      return response.data;
    } catch (error) {
      console.error("Error creating exit:", error);
      throw error;
    }
  },

  // Delete an exit
  deleteExit: async (exitId: string | number): Promise<boolean> => {
    if (!isServerConnected()) {
      // If not connected, pretend it was successful
      return true;
    }

    try {
      const apiClient = createApiClient();
      await apiClient.delete(`/exit/${exitId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting exit ${exitId}:`, error);
      throw error;
    }
  },

  // Update an exit
  updateExit: async (exitData: UpdateExitData): Promise<ExitResponse> => {
    if (!isServerConnected()) {
      // If not connected, return mock data
      return {
        id:
          typeof exitData.id === "string" ? parseInt(exitData.id) : exitData.id,
        name: exitData.name,
        description: exitData.description || "",
        source_id: 0, // These would be unknown in a mock response
        destination_id: 0,
        attributes: exitData.attributes,
      };
    }

    try {
      const apiClient = createApiClient();
      const response = await apiClient.post<ExitResponse>(
        `/exit/${exitData.id}`,
        {
          name: exitData.name,
          description: exitData.description,
          attributes: exitData.attributes,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating exit ${exitData.id}:`, error);
      throw error;
    }
  },
};

// Add a function to check server connection status
export const checkServerConnection = async (url: string): Promise<boolean> => {
  if (!url || url.trim() === "") return false;

  try {
    const response = await fetch(`${url}/rooms/names`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Error checking server connection:", error);
    return false;
  }
};

export default {
  roomApi,
  exitApi,
  checkServerConnection,
};
