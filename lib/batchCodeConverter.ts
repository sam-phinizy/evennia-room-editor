// Import the capitalizeFirstLetter function from utils
import { capitalizeFirstLetter } from './utils';

/**
 * Converts JSON data to Evennia batch code processor format
 *
 * The Evennia batch code processor format uses special section markers:
 * - #HEADER: Code that should be pasted at the top of all other code blocks
 * - #CODE: Designates a code block that will be executed
 * - #INSERT: Imports another batch code file
 *
 * @param jsonData - The JSON data to convert
 * @param options - Optional configuration settings
 * @returns A string containing the Evennia batch code
 */
interface EvenniaBatchOptions {
    /**
     * Common imports and variables to include in the HEADER section
     */
    commonImports?: string[];

    /**
     * Whether to add debug statements to help track processing
     */
    debug?: boolean;

    /**
     * Whether objects created should be flagged for auto-deletion in debug mode
     */
    makeObjectsDeletable?: boolean;

    /**
     * Whether to create return exits automatically
     */
    createReturnExits?: boolean;
}

function convertJsonToEvenniaBatchCode(
    jsonData: any,
    options: EvenniaBatchOptions = {}
): string {
    // Default options
    const defaultOptions: EvenniaBatchOptions = {
        commonImports: [
            "from evennia import create_object",
            "from evennia.utils import search",
            "from typeclasses.objects import Object",
            "from typeclasses.rooms import Room",
            "from typeclasses.exits import Exit",
        ],
        debug: false,
        makeObjectsDeletable: true,
        createReturnExits: false,
    };

    // Merge provided options with defaults
    const finalOptions = { ...defaultOptions, ...options };

    // Store created rooms by their ID for reference when creating exits
    const roomsById: { [id: string]: string } = {};

    // Initialize the batch code content
    let batchCode = "";

    // Add HEADER section with common imports and utility functions
    batchCode += "#HEADER\n";

    // Add common imports
    if (finalOptions.commonImports && finalOptions.commonImports.length > 0) {
        batchCode += finalOptions.commonImports.join("\n") + "\n\n";
    }

    // Add global variables and flags
    if (finalOptions.debug) {
        batchCode += "DEBUG = True\n";
    } else {
        batchCode += "DEBUG = False\n";
    }
    batchCode += "\n";
    batchCode += "rooms_by_id = {}\n\n";
    batchCode += "#CODE\n";

    // Process a node (room) from the JSON data
    function processNode(node: any): string {
        let code = "";
        code += `room_${node.id} = create_object(\n`;
        code += `    Room,\n`;
        code += `    key="${node.name || `Room ${node.id}`}",\n`;
        code += `)\n\n`;

        code += `rooms_by_id["${node.id}"] = room_${node.id}\n\n`;

        if (node.description) {
            code += `room_${node.id}.db.desc = """${node.description}"""\n\n`;
        }

        if (node.attributes) {
            if (node.attributes.description && !node.description) {
                code += `room_${node.id}.db.desc = """${node.attributes.description}"""\n`;
            }

            for (const [key, value] of Object.entries(node.attributes)) {
                if (key === "description") continue;

                if (typeof value === "string") {
                    code += `room_${node.id}.db.${key} = """${value}"""\n`;
                } else if (typeof value === "boolean") {
                    // Use capitalizeFirstLetter to ensure proper Python boolean format
                    code += `room_${node.id}.db.${key} = ${capitalizeFirstLetter(String(value))}\n`;
                } else {
                    code += `room_${node.id}.db.${key} = ${JSON.stringify(value)}\n`;
                }
            }
            code += `\n`;
        }

        if (finalOptions.makeObjectsDeletable) {
            code += `if DEBUG:\n`;
            code += `    room_${node.id}.tags.add("deletable")\n\n`;
        }

        roomsById[node.id] = `room_${node.id}`;

        return code;
    }

    // Process a relationship (exit) from the JSON data
    function processRelationship(rel: any): string {
        if (!rel.from || !rel.to) {
            return `# Error: Relationship requires both from and to\n\n`;
        }

        const exitName = rel.relationship || "Exit";

        let code = "";
        code += `from_room = rooms_by_id["${rel.from}"]\n`;
        code += `to_room = rooms_by_id["${rel.to}"]\n\n`;

        code += `exit_${rel.from}_to_${rel.to} = create_object(\n`;
        code += `    Exit,\n`;
        code += `    key="${exitName}",\n`;
        code += `    location=from_room,\n`;
        code += `    destination=to_room,\n`;
        code += `)\n\n`;

        // Set additional attributes
        if (rel.attributes && Object.keys(rel.attributes).length > 0) {
            for (let [key, value] of Object.entries(rel.attributes)) {
                if (typeof value === "boolean") {
                    // Use capitalizeFirstLetter to ensure proper Python boolean format
                    code += `exit_${rel.from}_to_${rel.to}.db.${key} = ${capitalizeFirstLetter(String(value))}\n`;
                } else if (value === "true" || value === "false") {
                    value = capitalizeFirstLetter(value as string);
                    code += `exit_${rel.from}_to_${rel.to}.db.${key} = ${value}\n`;
                } else if (typeof value === "string") {
                    code += `exit_${rel.from}_to_${rel.to}.db.${key} = """${value}"""\n`;
                } else {
                    code += `exit_${rel.from}_to_${rel.to}.db.${key} = ${JSON.stringify(value)}\n`;
                }
            }
            code += `\n`;
        }

        // Make deletable in debug mode if specified
        if (finalOptions.makeObjectsDeletable) {
            code += `if DEBUG:\n`;
            code += `    exit_${rel.from}_to_${rel.to}.tags.add("deletable")\n\n`;
        }

        // Handle two-way exits if twoWay flag is set
        if (rel.twoWay) {
            // Default reverse name if not specified (e.g., "north" -> "south", "up" -> "down")
            let reverseName = rel.reverseName || exitName;

            // Create return exit
            code += `exit_${rel.to}_to_${rel.from} = create_object(\n`;
            code += `    Exit,\n`;
            code += `    key="${reverseName}",\n`;
            code += `    location=to_room,\n`;
            code += `    destination=from_room,\n`;
            code += `)\n\n`;

            // Set additional attributes for return exit
            if (rel.attributes && Object.keys(rel.attributes).length > 0) {
                for (const [key, value] of Object.entries(rel.attributes)) {
                    if (key === "description") continue; // Skip description as it should be different for return exit

                    if (typeof value === "boolean") {
                        // Use capitalizeFirstLetter to ensure proper Python boolean format 
                        code += `exit_${rel.to}_to_${rel.from}.db.${key} = ${capitalizeFirstLetter(String(value))}\n`;
                    } else if (typeof value === "string" && (value.toLowerCase() === "true" || value.toLowerCase() === "false")) {
                        // Handle string boolean values
                        code += `exit_${rel.to}_to_${rel.from}.db.${key} = ${capitalizeFirstLetter(value)}\n`;
                    } else if (typeof value === "string") {
                        code += `exit_${rel.to}_to_${rel.from}.db.${key} = """${value}"""\n`;
                    } else {
                        code += `exit_${rel.to}_to_${rel.from}.db.${key} = ${JSON.stringify(value)}\n`;
                    }
                }
            }

            // Handle reverse description if provided
            if (rel.reverseDescription) {
                code += `exit_${rel.to}_to_${rel.from}.db.desc = """${rel.reverseDescription}"""\n`;
            }

            // Handle reverse aliases if provided
            if (rel.reverseAliases && Array.isArray(rel.reverseAliases) && rel.reverseAliases.length > 0) {
                code += `exit_${rel.to}_to_${rel.from}.aliases = [${rel.reverseAliases
                    .map((a: string) => `"${a}"`)
                    .join(", ")}]\n`;
            }

            code += `\n`;

            // Make return exit deletable in debug mode if specified
            if (finalOptions.makeObjectsDeletable) {
                code += `if DEBUG:\n`;
                code += `    exit_${rel.to}_to_${rel.from}.tags.add("deletable")\n\n`;
            }
        }

        return code;
    }

    // Helper functions for processing other entity types
    function processRoom(room: any): string {
        let code = "";
        code += `new_room = create_object(\n`;
        code += `    Room,\n`;
        code += `    key="${room.name || "Room"}",\n`;

        if (room.aliases && room.aliases.length > 0) {
            code += `    aliases=[${room.aliases
                .map((a: string) => `"${a}"`)
                .join(", ")}],\n`;
        }

        if (room.location) {
            code += `    location=search.object("${room.location}")[0],\n`;
        }

        code += `)\n\n`;

        if (room.desc) {
            code += `new_room.db.desc = """${room.desc}"""\n\n`;
        }

        if (room.attributes) {
            for (const [key, value] of Object.entries(room.attributes)) {
                if (typeof value === "string") {
                    code += `new_room.db.${key} = """${value}"""\n`;
                } else if (typeof value === "boolean") {
                    // Use capitalizeFirstLetter to ensure proper Python boolean format
                    code += `new_room.db.${key} = ${capitalizeFirstLetter(String(value))}\n`;
                } else {
                    code += `new_room.db.${key} = ${JSON.stringify(value)}\n`;
                }
            }
            code += `\n`;
        }

        if (finalOptions.makeObjectsDeletable) {
            code += `if DEBUG:\n`;
            code += `    new_room.tags.add("deletable")\n\n`;
        }

        return code;
    }

    // Process objects
    function processObject(obj: any): string {
        let code = "";
        code += `new_obj = create_object(\n`;
        code += `    Object,\n`;
        code += `    key="${obj.name || "Object"}",\n`;

        if (obj.aliases && obj.aliases.length > 0) {
            code += `    aliases=[${obj.aliases
                .map((a: string) => `"${a}"`)
                .join(", ")}],\n`;
        }

        if (obj.location) {
            code += `    location=search.object("${obj.location}")[0],\n`;
        }

        if (obj.home) {
            code += `    home=search.object("${obj.home}")[0],\n`;
        }

        code += `)\n\n`;

        if (obj.desc) {
            code += `new_obj.db.desc = """${obj.desc}"""\n\n`;
        }

        if (obj.attributes) {
            for (const [key, value] of Object.entries(obj.attributes)) {
                if (typeof value === "string") {
                    code += `new_obj.db.${key} = """${value}"""\n`;
                } else if (typeof value === "boolean") {
                    // Use capitalizeFirstLetter to ensure proper Python boolean format
                    code += `new_obj.db.${key} = ${capitalizeFirstLetter(String(value))}\n`;
                } else {
                    code += `new_obj.db.${key} = ${JSON.stringify(value)}\n`;
                }
            }
            code += `\n`;
        }

        if (finalOptions.makeObjectsDeletable) {
            code += `if DEBUG:\n`;
            code += `    new_obj.tags.add("deletable")\n\n`;
        }

        return code;
    }

    // Process characters
    function processCharacter(character: any): string {
        return "";  // Placeholder until specific implementation needed
    }

    // Process exits
    function processExit(exit: any): string {
        if (!exit.source || !exit.destination) {
            return "";
        }

        let code = "";
        code += `source_room = search.object("${exit.source}")[0]\n`;
        code += `destination_room = search.object("${exit.destination}")[0]\n\n`;

        code += `new_exit = create_object(\n`;
        code += `    Exit,\n`;
        code += `    key="${exit.name || "Exit"}",\n`;

        if (exit.aliases && exit.aliases.length > 0) {
            code += `    aliases=[${exit.aliases
                .map((a: string) => `"${a}"`)
                .join(", ")}],\n`;
        }

        code += `    location=source_room,\n`;
        code += `    destination=destination_room,\n`;
        code += `)\n\n`;

        if (exit.desc) {
            code += `new_exit.db.desc = """${exit.desc}"""\n\n`;
        }

        if (exit.attributes) {
            for (const [key, value] of Object.entries(exit.attributes)) {
                if (typeof value === "string") {
                    // Special handling for string booleans
                    if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
                        code += `new_exit.db.${key} = ${capitalizeFirstLetter(value)}\n`;
                    } else {
                        code += `new_exit.db.${key} = """${value}"""\n`;
                    }
                } else if (typeof value === "boolean") {
                    // Use capitalizeFirstLetter to ensure proper Python boolean format
                    code += `new_exit.db.${key} = ${capitalizeFirstLetter(String(value))}\n`;
                } else {
                    code += `new_exit.db.${key} = ${JSON.stringify(value)}\n`;
                }
            }
            code += `\n`;
        }

        if (finalOptions.makeObjectsDeletable) {
            code += `if DEBUG:\n`;
            code += `    new_exit.tags.add("deletable")\n\n`;
        }

        // Handle return exits if either twoWay or createReturn is true
        if (exit.twoWay || (exit.createReturn && exit.returnName)) {
            // Default return name to original name if not provided but twoWay is true
            const returnName = exit.twoWay ?
                (exit.reverseName || exit.returnName || exit.name || "Exit") :
                exit.returnName;

            // Get either reverseAliases (twoWay) or returnAliases (createReturn)
            const returnAliases = exit.twoWay ?
                exit.reverseAliases || exit.returnAliases || exit.aliases :
                exit.returnAliases;

            // Get either reverseDesc (twoWay) or returnDesc (createReturn)  
            const returnDesc = exit.twoWay ?
                exit.reverseDescription || exit.returnDesc :
                exit.returnDesc;

            code += `return_exit = create_object(\n`;
            code += `    Exit,\n`;
            code += `    key="${returnName}",\n`;

            if (returnAliases && returnAliases.length > 0) {
                code += `    aliases=[${returnAliases
                    .map((a: string) => `"${a}"`)
                    .join(", ")}],\n`;
            }

            code += `    location=destination_room,\n`;
            code += `    destination=source_room,\n`;
            code += `)\n\n`;

            if (returnDesc) {
                code += `return_exit.db.desc = """${returnDesc}"""\n\n`;
            }

            // Copy attributes to return exit if needed
            if (exit.twoWay && exit.attributes && !exit.skipReturnAttributes) {
                for (const [key, value] of Object.entries(exit.attributes)) {
                    if (key === "description") continue; // Skip description as it should be different

                    if (typeof value === "boolean") {
                        // Use capitalizeFirstLetter to ensure proper Python boolean format
                        code += `return_exit.db.${key} = ${capitalizeFirstLetter(String(value))}\n`;
                    } else if (typeof value === "string" && (value.toLowerCase() === "true" || value.toLowerCase() === "false")) {
                        // Handle string boolean values
                        code += `return_exit.db.${key} = ${capitalizeFirstLetter(value)}\n`;
                    } else if (typeof value === "string") {
                        code += `return_exit.db.${key} = """${value}"""\n`;
                    } else {
                        code += `return_exit.db.${key} = ${JSON.stringify(value)}\n`;
                    }
                }
                code += `\n`;
            }

            if (finalOptions.makeObjectsDeletable) {
                code += `if DEBUG:\n`;
                code += `    return_exit.tags.add("deletable")\n\n`;
            }
        }

        return code;
    }

    // Process any other entity type
    function processGenericEntity(entity: any, entityType: string): string {
        let code = ``;
        return code;
    }

    // Helper function to process an entity based on its type
    function processEntity(entity: any, entityType: string): string {
        // Based on the entity type, call the appropriate processing function
        switch (entityType.toLowerCase()) {
            case "room":
                return processRoom(entity);
            case "object":
                return processObject(entity);
            case "character":
                return processCharacter(entity);
            case "exit":
                return processExit(entity);
            default:
                return processGenericEntity(entity, entityType);
        }
    }

    // Process the specific format with nodes and relationships
    function processNodesAndRelationships(data: any): string {
        let codeBlocks = "";

        // First, process all nodes (rooms)
        if (data.nodes && Array.isArray(data.nodes)) {

            data.nodes.forEach((node: any) => {
                codeBlocks += processNode(node);
            });

            codeBlocks += `caller.msg("Created ${data.nodes.length} rooms")\n\n`;
        }

        // Then, process all relationships (exits)
        if (data.relationships && Array.isArray(data.relationships)) {

            data.relationships.forEach((rel: any) => {
                codeBlocks += processRelationship(rel);
            });

            codeBlocks += `caller.msg("Created ${data.relationships.length} exits")\n\n`;
        }

        return codeBlocks;
    }

    // Main processing logic to handle the JSON structure
    function processJsonData(data: any): string {
        // Handle null, undefined or non-object data
        if (!data) {
            return `#CODE\ncaller.msg("No data provided")\n\n`;
        }

        // Handle the specific format with nodes and relationships
        if (data.nodes && data.relationships) {
            return processNodesAndRelationships(data);
        }

        let codeBlocks = "";

        // If data is an array, process each item
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                const entityType = item.type || "generic";
                codeBlocks += processEntity(item, entityType);
                codeBlocks += `caller.msg("Processed ${entityType} ${item.name || "unnamed"
                    }")\n\n`;
            });
        }
        // If data is an object with a "world" property containing an array
        else if (data.world && Array.isArray(data.world)) {
            data.world.forEach((item: any) => {
                const entityType = item.type || "generic";
                codeBlocks += processEntity(item, entityType);
                codeBlocks += `caller.msg("Processed ${entityType} ${item.name || "unnamed"
                    }")\n\n`;
            });
        }
        // If data is just a single object
        else {

            // Determine entity type
            const entityType = data.type || "generic";
            codeBlocks += processEntity(data, entityType);

            codeBlocks += `caller.msg("Processed ${entityType} ${data.name || "unnamed"
                }")\n\n`;
        }

        return codeBlocks;
    }

    // Process the JSON data and add code blocks to the batch file
    batchCode += processJsonData(jsonData);

    // Add a final success message
    batchCode += `caller.msg("Batch processing completed successfully.")\n`;

    return batchCode;
}

// Example usage:
/* 
// For a nodes and relationships structure:
const jsonData = {
  "nodes": [
    {
      "id": "1",
      "name": "Town Square",
      "description": "A bustling town square with cobblestone streets.",
      "attributes": {
        "climate": "temperate",
        "noise_level": "high"
      }
    },
    {
      "id": "2",
      "name": "Town Gate",
      "description": "A massive gate leading to the countryside.",
      "attributes": {
        "climate": "temperate",
        "secure": true
      }
    }
  ],
  "relationships": [
    {
      "from": "1",
      "to": "2",
      "relationship": "north",
      "attributes": {
        "description": "A path leading to the town gate."
      }
    },
    {
      "from": "2",
      "to": "1",
      "relationship": "south",
      "attributes": {
        "description": "A path leading back to town square."
      }
    }
  ]
};
 
// Or for a world-based structure:
const worldJsonData = {
  "world": [
    {
      "type": "room",
      "name": "Town Square",
      "desc": "A bustling town square with cobblestone streets.",
      "attributes": {
        "climate": "temperate",
        "noise_level": "high"
      }
    },
    {
      "type": "object",
      "name": "Fountain",
      "desc": "A beautiful stone fountain with crystal clear water.",
      "location": "Town Square",
      "attributes": {
        "material": "stone",
        "working": true
      }
    },
    {
      "type": "exit",
      "name": "north",
      "aliases": ["n"],
      "desc": "A path leading to the town gate.",
      "source": "Town Square",
      "destination": "Town Gate",
      "createReturn": true,
      "returnName": "south",
      "returnAliases": ["s"],
      "returnDesc": "A path leading back to the town square."
    }
  ]
};
 
const batchCode = convertJsonToEvenniaBatchCode(jsonData);
console.log(batchCode);
*/

export { convertJsonToEvenniaBatchCode };
