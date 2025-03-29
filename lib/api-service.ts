import axios from "axios";

// Define the base API URL
const API_BASE_URL = "http://127.0.0.1:8000";

// API client instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

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
      const response = await apiClient.post<RoomResponse>("/room", roomData);
      return response.data;
    } catch (error) {
      console.error("Error creating room:", error);
      throw error;
    }
  },

  // Delete a room
  deleteRoom: async (roomId: string | number): Promise<boolean> => {
    try {
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
    try {
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
    try {
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
    try {
      const response = await apiClient.post<ExitResponse>("/exit", exitData);
      return response.data;
    } catch (error) {
      console.error("Error creating exit:", error);
      throw error;
    }
  },

  // Delete an exit
  deleteExit: async (exitId: string | number): Promise<boolean> => {
    try {
      await apiClient.delete(`/exit/${exitId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting exit ${exitId}:`, error);
      throw error;
    }
  },

  // Update an exit
  updateExit: async (exitData: UpdateExitData): Promise<ExitResponse> => {
    try {
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

export default {
  roomApi,
  exitApi,
};
