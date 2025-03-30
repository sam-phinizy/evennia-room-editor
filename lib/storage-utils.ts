import { Node, Edge, MarkerType } from "reactflow";

// Storage keys
export const STORAGE_KEYS = {
  FLOW: "flow-diagram-flow",
} as const;

// Default nodes if nothing in storage
export const defaultNodes: Node[] = [
  {
    id: "1",
    type: "custom",
    data: {
      label: "Ancient Stone Archway",
      description:
        "A weathered stone archway marks the entrance to the dungeon. Moss-covered runes glow faintly with a pale blue light, casting eerie shadows on the rough-hewn walls. The air is thick with the scent of damp earth and ancient magic.",
      attr_light_level: "dim",
      attr_ambient_sound: "dripping water",
      attr_room_type: "entrance",
    },
    position: { x: 150, y: 100 },
  },
  {
    id: "2",
    type: "custom",
    data: {
      label: "Guardian's Chamber",
      description:
        "A circular chamber with walls covered in intricate carvings of warriors and mythical beasts. A massive stone statue of an armored knight stands in the center, its eyes seeming to follow visitors. The floor is inlaid with a complex pattern of interlocking circles.",
      attr_light_level: "bright",
      attr_ambient_sound: "stone grinding",
      attr_room_type: "guardian",
    },
    position: { x: 400, y: 100 },
  },
  {
    id: "3",
    type: "custom",
    data: {
      label: "Crystal Cavern",
      description:
        "A vast natural cavern where massive crystals grow from floor and ceiling, casting prismatic light in all directions. The air is cool and crisp, and the crystals hum with a faint magical resonance. Small pools of crystal-clear water dot the floor.",
      attr_light_level: "bright",
      attr_ambient_sound: "crystal humming",
      attr_room_type: "magical",
    },
    position: { x: 250, y: 300 },
  },
  {
    id: "4",
    type: "custom",
    data: {
      label: "Treasury of the Ancients",
      description:
        "A vaulted chamber filled with ancient artifacts and treasures. Golden statues line the walls, and precious gems are embedded in the ceiling. The air is thick with the scent of old gold and incense. A magical barrier shimmers at the entrance.",
      attr_light_level: "bright",
      attr_ambient_sound: "magical humming",
      attr_room_type: "treasury",
    },
    position: { x: 550, y: 300 },
  },
  {
    id: "5",
    type: "custom",
    data: {
      label: "Forgotten Library",
      description:
        "A vast library with towering shelves of ancient tomes and scrolls. The air is thick with the scent of old parchment and leather. Magical orbs float near the ceiling, providing soft illumination. A thick layer of dust covers everything.",
      attr_light_level: "dim",
      attr_ambient_sound: "pages rustling",
      attr_room_type: "library",
    },
    position: { x: 700, y: 100 },
  },
];

// Default edges if nothing in storage
export const defaultEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    sourceHandle: "right-source",
    targetHandle: "left-target",
    type: "custom",
    data: {
      label: "Stone Passage",
      description:
        "A wide corridor of polished stone blocks, lined with ancient sconces that burn with magical flame. The walls are covered in faded murals depicting epic battles.",
      attr_difficulty: "easy",
      attr_light_level: "bright",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#3b82f6",
    },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    sourceHandle: "bottom-source",
    targetHandle: "top-target",
    type: "custom",
    data: {
      label: "Narrow Passage",
      description:
        "A tight, winding passage that descends steeply. The walls are rough and natural, with occasional patches of phosphorescent fungus providing dim light.",
      attr_difficulty: "medium",
      attr_light_level: "dim",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#3b82f6",
    },
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    sourceHandle: "right-source",
    targetHandle: "left-target",
    type: "custom",
    data: {
      label: "Secret Passage",
      description:
        "A hidden passage concealed behind a crystal formation. The walls are lined with magical wards and traps, requiring careful navigation.",
      attr_difficulty: "hard",
      attr_light_level: "dark",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#3b82f6",
    },
  },
  {
    id: "e2-5",
    source: "2",
    target: "5",
    sourceHandle: "right-source",
    targetHandle: "left-target",
    type: "custom",
    data: {
      label: "Grand Hallway",
      description:
        "A magnificent hallway with high vaulted ceilings. Marble columns line the walls, and magical tapestries depict scenes of ancient magic and wisdom.",
      attr_difficulty: "easy",
      attr_light_level: "bright",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#3b82f6",
    },
  },
];

// Load data from local storage
export const loadFromStorage = () => {
  if (typeof window === "undefined")
    return { nodes: defaultNodes, edges: defaultEdges };

  try {
    const flowJson = localStorage.getItem(STORAGE_KEYS.FLOW);
    if (!flowJson) return { nodes: defaultNodes, edges: defaultEdges };

    const flow = JSON.parse(flowJson);
    return {
      nodes: flow.nodes || defaultNodes,
      edges: flow.edges || defaultEdges,
    };
  } catch (error) {
    console.error("Error loading from local storage:", error);
    return { nodes: defaultNodes, edges: defaultEdges };
  }
};

// Save flow data to local storage
export const saveToStorage = (nodes: Node[], edges: Edge[]) => {
  try {
    const flow = { nodes, edges };
    localStorage.setItem(STORAGE_KEYS.FLOW, JSON.stringify(flow));
    return true;
  } catch (error) {
    console.error("Error saving to local storage:", error);
    return false;
  }
};
