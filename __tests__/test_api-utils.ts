import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import { createRoomInApi } from "./your-module-path";
import * as serverUtils from "./server-utils"; // Assuming isServerConnected is here
import * as roomApi from "./room-api"; // Assuming roomApi.createRoom is here

// Mock dependencies
vi.mock("./server-utils", () => ({
  isServerConnected: vi.fn(),
}));

vi.mock("./room-api", () => ({
  createRoom: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock console.error
vi.spyOn(console, "error").mockImplementation(() => {});

describe("createRoomInApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when server is not connected", () => {
    beforeEach(() => {
      vi.mocked(serverUtils.isServerConnected).mockReturnValue(false);
    });

    it("should create a room with local ID when localStorage is empty", async () => {
      const roomData = { name: "Test Room", description: "Test Description" };

      const result = await createRoomInApi(roomData);

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "flow-diagram-next-id"
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "flow-diagram-next-id",
        "0"
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "flow-diagram-next-id",
        "-1"
      );
      expect(result).toEqual({
        id: -1,
        name: "Test Room",
        description: "Test Description",
        attributes: undefined,
      });
    });

    it("should create a room with decremented local ID when localStorage has value", async () => {
      vi.mocked(localStorageMock.getItem).mockReturnValueOnce("-5");
      const roomData = {
        name: "Another Room",
        description: "Another Description",
        attributes: { color: "blue" },
      };

      const result = await createRoomInApi(roomData);

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "flow-diagram-next-id"
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "flow-diagram-next-id",
        "-6"
      );
      expect(result).toEqual({
        id: -6,
        name: "Another Room",
        description: "Another Description",
        attributes: { color: "blue" },
      });
    });
  });

  describe("when server is connected", () => {
    beforeEach(() => {
      vi.mocked(serverUtils.isServerConnected).mockReturnValue(true);
    });

    it("should call roomApi.createRoom and return the data on success", async () => {
      const roomData = { name: "API Room", description: "API Description" };
      const apiResponse = {
        id: 123,
        name: "API Room",
        description: "API Description",
        createdAt: "2025-03-30T12:00:00Z",
      };

      vi.mocked(roomApi.createRoom).mockResolvedValueOnce(apiResponse);

      const result = await createRoomInApi(roomData);

      expect(roomApi.createRoom).toHaveBeenCalledWith(roomData);
      expect(result).toEqual(apiResponse);
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("should throw error when roomApi.createRoom fails", async () => {
      const roomData = { name: "Error Room", description: "Error Description" };
      const apiError = new Error("API Error");

      vi.mocked(roomApi.createRoom).mockRejectedValueOnce(apiError);

      await expect(createRoomInApi(roomData)).rejects.toThrow("API Error");
      expect(roomApi.createRoom).toHaveBeenCalledWith(roomData);
      expect(console.error).toHaveBeenCalledWith(
        "Error creating room in API:",
        apiError
      );
    });
  });
});
