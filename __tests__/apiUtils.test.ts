import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import { createRoomInApi } from "../lib/api-utils";
import { roomApi } from "../lib/api-service";

// Mock api-service module's createRoom function
vi.mock("../lib/api-service", () => ({
  roomApi: {
    createRoom: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock console.error to prevent console output during tests
vi.spyOn(console, "error").mockImplementation(() => {});

describe("createRoomInApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: When server is not connected (determined by localStorage values)
  it("should create a room with local ID when server is not connected", async () => {
    // Setup localStorage to indicate server is not connected
    localStorageMock.store["flow-diagram-server-url"] = "";
    localStorageMock.store["flow-diagram-server-enabled"] = "false";
    
    const roomData = { name: "Test Room", description: "Test Description" };
    
    const result = await createRoomInApi(roomData);
    
    // Verify the result has a negative ID and correct data
    expect(result.id).toBeLessThan(0);
    expect(result.name).toBe("Test Room");
    expect(result.description).toBe("Test Description");
    
    // Verify createRoom was not called
    expect(roomApi.createRoom).not.toHaveBeenCalled();
  });

  // Test 2: When server is connected but API fails
  it("should throw an error when server is connected but API fails", async () => {
    // Setup localStorage to indicate server is connected
    localStorageMock.store["flow-diagram-server-url"] = "http://example.com";
    localStorageMock.store["flow-diagram-server-enabled"] = "true";
    
    const roomData = { name: "Error Room", description: "Error Description" };
    const apiError = new Error("API Error");
    
    // Setup the API mock to throw an error
    vi.mocked(roomApi.createRoom).mockRejectedValueOnce(apiError);
    
    // The function should throw the same error
    await expect(createRoomInApi(roomData)).rejects.toThrow("API Error");
    
    // Verify createRoom was called with correct data
    expect(roomApi.createRoom).toHaveBeenCalledWith(roomData);
  });
  
  // Test 3: When server is connected and API succeeds
  it("should return API response when server is connected and API succeeds", async () => {
    // Setup localStorage to indicate server is connected
    localStorageMock.store["flow-diagram-server-url"] = "http://example.com";
    localStorageMock.store["flow-diagram-server-enabled"] = "true";
    
    const roomData = { name: "API Room", description: "API Description" };
    const apiResponse = {
      id: 123,
      name: "API Room",
      description: "API Description",
      createdAt: "2023-01-01T00:00:00Z",
    };
    
    // Setup the API mock to return data
    vi.mocked(roomApi.createRoom).mockResolvedValueOnce(apiResponse);
    
    const result = await createRoomInApi(roomData);
    
    // Verify the result matches the API response
    expect(result).toEqual(apiResponse);
    
    // Verify createRoom was called with correct data
    expect(roomApi.createRoom).toHaveBeenCalledWith(roomData);
  });
});
