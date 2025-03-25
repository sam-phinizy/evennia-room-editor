import { describe, it, expect } from "vitest";
import { convertJsonToEvenniaBatchCode } from "./batchCodeConverter";

describe("convertJsonToEvenniaBatchCode", () => {
  it("should convert nodes and relationships format correctly", () => {
    // Test data with nodes and relationships
    const jsonData = {
      nodes: [
        {
          id: "1",
          name: "Town Square",
          description: "A bustling town square with cobblestone streets.",
          attributes: {
            climate: "temperate",
            noise_level: "high",
          },
        },
        {
          id: "2",
          name: "Town Gate",
          description: "A massive gate leading to the countryside.",
          attributes: {
            climate: "temperate",
            secure: true,
          },
        },
      ],
      relationships: [
        {
          from: "1",
          to: "2",
          relationship: "north",
          attributes: {
            description: "A path leading to the town gate.",
          },
        },
        {
          from: "2",
          to: "1",
          relationship: "south",
          attributes: {
            description: "A path leading back to town square.",
          },
        },
      ],
    };

    const result = convertJsonToEvenniaBatchCode(jsonData);

    // Check that the result is a string
    expect(typeof result).toBe("string");

    // Check for expected content
    expect(result).toContain("#HEADER");
    expect(result).toContain("#CODE");
    expect(result).toContain("from evennia import create_object");

    // Check that nodes were processed
    expect(result).toContain("room_1 = create_object");
    expect(result).toContain("room_2 = create_object");
    expect(result).toContain("Town Square");
    expect(result).toContain("Town Gate");

    // Check that relationships were processed
    expect(result).toContain("exit_1_to_2 = create_object");
    expect(result).toContain("exit_2_to_1 = create_object");
    expect(result).toContain('key="north"');
    expect(result).toContain('key="south"');

    // Check that attributes were set
    expect(result).toContain(
      'room_1.db.desc = """A bustling town square with cobblestone streets."""'
    );
    expect(result).toContain('room_1.db.climate = """temperate"""');
    expect(result).toContain('room_1.db.noise_level = """high"""');
    expect(result).toContain("room_2.db.secure = True");
  });

  it("should convert world array format correctly", () => {
    // Test data with world array
    const worldJsonData = {
      world: [
        {
          type: "room",
          name: "Town Square",
          desc: "A bustling town square with cobblestone streets.",
          attributes: {
            climate: "temperate",
            noise_level: "high",
          },
        },
        {
          type: "object",
          name: "Fountain",
          desc: "A beautiful stone fountain with crystal clear water.",
          location: "Town Square",
          attributes: {
            material: "stone",
            working: true,
          },
        },
        {
          type: "exit",
          name: "north",
          aliases: ["n"],
          desc: "A path leading to the town gate.",
          source: "Town Square",
          destination: "Town Gate",
          createReturn: true,
          returnName: "south",
          returnAliases: ["s"],
          returnDesc: "A path leading back to the town square.",
        },
      ],
    };

    const result = convertJsonToEvenniaBatchCode(worldJsonData);

    // Check that the result is a string
    expect(typeof result).toBe("string");

    // Check for expected content
    expect(result).toContain("#HEADER");
    expect(result).toContain("#CODE");

    // Check that each entity type was processed
    expect(result).toContain("new_room = create_object");
    expect(result).toContain("new_obj = create_object");
    expect(result).toContain("new_exit = create_object");

    // Check for attributes and properties
    expect(result).toContain(
      'new_room.db.desc = """A bustling town square with cobblestone streets."""'
    );
    expect(result).toContain(
      'new_obj.db.desc = """A beautiful stone fountain with crystal clear water."""'
    );
    expect(result).toContain('new_room.db.climate = """temperate"""');
    expect(result).toContain('new_room.db.noise_level = """high"""');
    expect(result).toContain('new_obj.db.material = """stone"""');
    expect(result).toContain("new_obj.db.working = True");

    // Check for exit aliases
    expect(result).toContain('aliases=["n"]');
  });

  it("should handle a single entity correctly", () => {
    // Test data with a single object
    const singleObjectData = {
      type: "room",
      name: "Dungeon Cell",
      desc: "A dark and damp cell with stone walls.",
      attributes: {
        light: "dim",
        damp: true,
      },
    };

    const result = convertJsonToEvenniaBatchCode(singleObjectData);

    // Check that the result is a string
    expect(typeof result).toBe("string");

    // Check for expected content
    expect(result).toContain("#HEADER");
    expect(result).toContain("#CODE");

    // Check that the room was processed
    expect(result).toContain("new_room = create_object");
    expect(result).toContain(
      'new_room.db.desc = """A dark and damp cell with stone walls."""'
    );
  });

  it("should apply custom options correctly", () => {
    // Basic data for testing options
    const basicData = {
      id: "test",
      name: "Test Room",
      description: "A test room.",
    };

    // Test with custom options
    const customOptions = {
      commonImports: ["import custom_module"],
      debug: true,
      makeObjectsDeletable: false,
      createReturnExits: true,
    };

    const result = convertJsonToEvenniaBatchCode(basicData, customOptions);

    // Check that options were applied
    expect(result).toContain("import custom_module");
    expect(result).toContain("DEBUG = True");
    expect(result).not.toContain('tags.add("deletable")');
  });

  it("should handle missing or invalid data gracefully", () => {
    // Test with empty object
    const emptyData = {};
    const result1 = convertJsonToEvenniaBatchCode(emptyData);

    // Should still create a valid batch file structure
    expect(result1).toContain("#HEADER");
    expect(result1).toContain("#CODE");

    // Test with null
    const result2 = convertJsonToEvenniaBatchCode(null as any);
    expect(typeof result2).toBe("string");

    // Test with invalid relationship (missing from/to)
    const invalidRelData = {
      nodes: [{ id: "1", name: "Room 1" }],
      relationships: [{ relationship: "broken" }],
    };

    const result3 = convertJsonToEvenniaBatchCode(invalidRelData);
    expect(result3).toContain(
      "# Error: Relationship requires both from and to"
    );
  });

  it("should handle two-way exits correctly", () => {
    // Test data with two-way exits in nodes/relationships format
    const jsonData = {
      nodes: [
        {
          id: "1",
          name: "Town Square",
          description: "A bustling town square with cobblestone streets.",
        },
        {
          id: "2",
          name: "Market",
          description: "A busy market with various vendors.",
        },
      ],
      relationships: [
        {
          from: "1",
          to: "2",
          relationship: "east",
          twoWay: true,
          reverseName: "west",
          reverseAliases: ["w"],
          reverseDescription: "The town square lies to the west.",
          attributes: {
            description: "A path leading to the market.",
            is_visible: true
          },
        },
      ],
    };

    const result = convertJsonToEvenniaBatchCode(jsonData);

    // Check for expected content
    expect(typeof result).toBe("string");

    // Check that the relationship was processed
    expect(result).toContain('exit_1_to_2 = create_object');
    expect(result).toContain('key="east"');

    // Check that the reverse relationship was created
    expect(result).toContain('exit_2_to_1 = create_object');
    expect(result).toContain('key="west"');

    // Check that reverse aliases were set
    expect(result).toContain('exit_2_to_1.aliases = ["w"]');

    // Check that reverse description was set
    expect(result).toContain('exit_2_to_1.db.desc = """The town square lies to the west."""');

    // Check that attributes were correctly applied
    expect(result).toContain('exit_1_to_2.db.is_visible = True');
    expect(result).toContain('exit_2_to_1.db.is_visible = True');
  });

  it("should handle two-way exits in world format correctly", () => {
    // Test data with two-way exits in world format
    const worldJsonData = {
      world: [
        {
          type: "room",
          name: "Town Square",
          desc: "A bustling town square with cobblestone streets.",
        },
        {
          type: "room",
          name: "Market",
          desc: "A busy market with various vendors.",
        },
        {
          type: "exit",
          name: "east",
          aliases: ["e"],
          desc: "A path leading to the market.",
          source: "Town Square",
          destination: "Market",
          twoWay: true,
          reverseName: "west",
          reverseAliases: ["w"],
          reverseDescription: "The town square lies to the west.",
          attributes: {
            is_visible: true
          }
        },
      ],
    };

    const result = convertJsonToEvenniaBatchCode(worldJsonData);

    // Check for expected content
    expect(typeof result).toBe("string");

    // Check that the exit was processed
    expect(result).toContain('new_exit = create_object');
    expect(result).toContain('key="east"');

    // Check that the reverse exit was created
    expect(result).toContain('return_exit = create_object');
    expect(result).toContain('key="west"');

    // Check that reverse aliases were set correctly
    expect(result).toContain('aliases=["w"]');

    // Check that reverse description was set
    expect(result).toContain('return_exit.db.desc = """The town square lies to the west."""');

    // Check that attributes were correctly applied to both exits
    expect(result).toContain('new_exit.db.is_visible = True');
    expect(result).toContain('return_exit.db.is_visible = True');
  });

  it("should properly capitalize boolean values for Python syntax", () => {
    // Test data with boolean values in different casing
    const jsonData = {
      nodes: [
        {
          id: "1",
          name: "Control Room",
          description: "A room with various controls.",
          attributes: {
            isActive: true,
            isLocked: false,
            hasPower: true
          }
        }
      ],
      relationships: [
        {
          from: "1",
          to: "1", // Self-referencing for simplicity
          relationship: "Button",
          attributes: {
            isVisible: true,
            isDisabled: false
          }
        }
      ]
    };

    const result = convertJsonToEvenniaBatchCode(jsonData);

    // Check that boolean values are properly capitalized
    expect(result).toContain("room_1.db.isActive = True");
    expect(result).toContain("room_1.db.isLocked = False");
    expect(result).toContain("room_1.db.hasPower = True");
    expect(result).toContain("exit_1_to_1.db.isVisible = True");
    expect(result).toContain("exit_1_to_1.db.isDisabled = False");

    // Test string value that looks like a boolean
    const stringBooleanData = {
      world: [
        {
          type: "exit",
          name: "Door",
          source: "Room A",
          destination: "Room B",
          attributes: {
            isActive: "true",
            isLocked: "false"
          }
        }
      ]
    };

    const stringBooleanResult = convertJsonToEvenniaBatchCode(stringBooleanData);

    // Check that string booleans are also handled correctly
    expect(stringBooleanResult).toContain("new_exit.db.isActive = True");
    expect(stringBooleanResult).toContain("new_exit.db.isLocked = False");

    // Check for the specific issue in the example file
    const exitWithBooleanData = {
      world: [
        {
          type: "exit",
          name: "Exit",
          source: "Room A",
          destination: "Room B",
          attributes: {
            isActive: true
          }
        }
      ]
    };

    const exitResult = convertJsonToEvenniaBatchCode(exitWithBooleanData);
    expect(exitResult).toContain("new_exit.db.isActive = True");
    expect(exitResult).not.toContain("new_exit.db.isActive = true");
  });
});
