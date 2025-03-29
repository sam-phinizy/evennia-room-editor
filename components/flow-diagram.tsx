"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  Panel,
  type NodeTypes,
  type EdgeTypes,
  MarkerType,
  type OnSelectionChangeParams,
  BackgroundVariant,
  useReactFlow,
} from "reactflow"
import "reactflow/dist/style.css"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Download, FileJson, Code, Database } from "lucide-react"
import CustomNode from "./custom-node"
import CustomEdge from "./custom-edge"
import PropertySidebar from "./property-sidebar"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useAttributeSchema } from "@/hooks/use-attribute-schema"
import { AttributeSchemaItem } from "@/components/attribute-schema-modal"
import { convertJsonToEvenniaBatchCode } from "@/lib/batchCodeConverter"
import { useToast } from "@/components/ui/use-toast"
import { roomApi, exitApi, type RoomResponse, type ExitResponse } from "@/lib/api-service"

// Storage keys
const STORAGE_KEYS = {
  FLOW: "flow-diagram-flow",
} as const

// Default nodes if nothing in storage
const defaultNodes: Node[] = [
  {
    id: "1",
    type: "custom",
    data: { 
      label: "Ancient Stone Archway",
      description: "A weathered stone archway marks the entrance to the dungeon. Moss-covered runes glow faintly with a pale blue light, casting eerie shadows on the rough-hewn walls. The air is thick with the scent of damp earth and ancient magic.",
      attr_light_level: "dim",
      attr_ambient_sound: "dripping water",
      attr_room_type: "entrance"
    },
    position: { x: 150, y: 100 },
  },
  {
    id: "2",
    type: "custom",
    data: { 
      label: "Guardian's Chamber",
      description: "A circular chamber with walls covered in intricate carvings of warriors and mythical beasts. A massive stone statue of an armored knight stands in the center, its eyes seeming to follow visitors. The floor is inlaid with a complex pattern of interlocking circles.",
      attr_light_level: "bright",
      attr_ambient_sound: "stone grinding",
      attr_room_type: "guardian"
    },
    position: { x: 400, y: 100 },
  },
  {
    id: "3",
    type: "custom",
    data: { 
      label: "Crystal Cavern",
      description: "A vast natural cavern where massive crystals grow from floor and ceiling, casting prismatic light in all directions. The air is cool and crisp, and the crystals hum with a faint magical resonance. Small pools of crystal-clear water dot the floor.",
      attr_light_level: "bright",
      attr_ambient_sound: "crystal humming",
      attr_room_type: "magical"
    },
    position: { x: 250, y: 300 },
  },
  {
    id: "4",
    type: "custom",
    data: { 
      label: "Treasury of the Ancients",
      description: "A vaulted chamber filled with ancient artifacts and treasures. Golden statues line the walls, and precious gems are embedded in the ceiling. The air is thick with the scent of old gold and incense. A magical barrier shimmers at the entrance.",
      attr_light_level: "bright",
      attr_ambient_sound: "magical humming",
      attr_room_type: "treasury"
    },
    position: { x: 550, y: 300 },
  },
  {
    id: "5",
    type: "custom",
    data: { 
      label: "Forgotten Library",
      description: "A vast library with towering shelves of ancient tomes and scrolls. The air is thick with the scent of old parchment and leather. Magical orbs float near the ceiling, providing soft illumination. A thick layer of dust covers everything.",
      attr_light_level: "dim",
      attr_ambient_sound: "pages rustling",
      attr_room_type: "library"
    },
    position: { x: 700, y: 100 },
  }
]

// Default edges if nothing in storage
const defaultEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    sourceHandle: "right-source",
    targetHandle: "left-target",
    type: "custom",
    data: { 
      label: "Stone Passage",
      description: "A wide corridor of polished stone blocks, lined with ancient sconces that burn with magical flame. The walls are covered in faded murals depicting epic battles.",
      attr_difficulty: "easy",
      attr_light_level: "bright"
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
      description: "A tight, winding passage that descends steeply. The walls are rough and natural, with occasional patches of phosphorescent fungus providing dim light.",
      attr_difficulty: "medium",
      attr_light_level: "dim"
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
      description: "A hidden passage concealed behind a crystal formation. The walls are lined with magical wards and traps, requiring careful navigation.",
      attr_difficulty: "hard",
      attr_light_level: "dark"
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
      description: "A magnificent hallway with high vaulted ceilings. Marble columns line the walls, and magical tapestries depict scenes of ancient magic and wisdom.",
      attr_difficulty: "easy",
      attr_light_level: "bright"
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#3b82f6",
    },
  }
]

// Define custom node and edge types - moved outside component
const nodeTypes = {
  custom: CustomNode,
} as NodeTypes

const edgeTypes = {
  custom: CustomEdge,
} as EdgeTypes

// Helper function to get edge color based on label
const getEdgeColorByLabel = (label: string) => {
  switch (label.toLowerCase()) {
    case "connects to":
      return "#3b82f6" // blue
    case "depends on":
      return "#ef4444" // red
    case "references":
      return "#10b981" // green
    default:
      return "#888" // default gray
  }
}

// Utility function to apply schema attributes to node data
const applySchemaToNodeData = (nodeData: { [key: string]: any }, schema: AttributeSchemaItem[]) => {
  schema.forEach((item: AttributeSchemaItem) => {
    // Only apply if the attribute doesn't already exist
    if (!(`attr_${item.name}` in nodeData)) {
      if (item.default !== undefined) {
        nodeData[`attr_${item.name}`] = item.default
      } else {
        // Add empty attribute based on type
        if (item.type === 'string') nodeData[`attr_${item.name}`] = ''
        if (item.type === 'int') nodeData[`attr_${item.name}`] = 0
        if (item.type === 'float') nodeData[`attr_${item.name}`] = 0.0
        if (item.type === 'boolean') nodeData[`attr_${item.name}`] = false
      }
    }
  })
  return nodeData
}

// Create a room in the API
const createRoomInApi = async (roomData: { 
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

// Create an exit in the API
const createExitInApi = async (exitData: {
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

// Delete a room from the API
const deleteRoomFromApi = async (roomId: string | number) => {
  try {
    return await roomApi.deleteRoom(roomId);
  } catch (error) {
    console.error(`Error deleting room ${roomId} from API:`, error);
    throw error;
  }
};

// Delete an exit from the API
const deleteExitFromApi = async (exitId: string | number) => {
  try {
    return await exitApi.deleteExit(exitId);
  } catch (error) {
    console.error(`Error deleting exit ${exitId} from API:`, error);
    throw error;
  }
};

// Load data from local storage
const loadFromStorage = () => {
  if (typeof window === "undefined") return { nodes: defaultNodes, edges: defaultEdges }

  try {
    const flowJson = localStorage.getItem(STORAGE_KEYS.FLOW)
    if (!flowJson) return { nodes: defaultNodes, edges: defaultEdges }

    const flow = JSON.parse(flowJson)
    return {
      nodes: flow.nodes || defaultNodes,
      edges: flow.edges || defaultEdges,
    }
  } catch (error) {
    console.error("Error loading from local storage:", error)
    return { nodes: defaultNodes, edges: defaultEdges }
  }
}

// Define the interface for selected elements
interface SelectedElements {
  nodes: Node[];
  edges: Edge[];
}

const FlowDiagramInner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(loadFromStorage().nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadFromStorage().edges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [selectedElements, setSelectedElements] = useState<SelectedElements>({
    nodes: [],
    edges: [],
  })
  const { screenToFlowPosition } = useReactFlow()
  // Get schema at the component level, not inside a callback
  const { schema } = useAttributeSchema()
  const { toast } = useToast()

  // Save to local storage whenever nodes or edges change
  useEffect(() => {
    if (!reactFlowInstance) return

    try {
      // Instead of using toObject, create our own flow object
      const flow = {
        nodes,
        edges,
      };
      localStorage.setItem(STORAGE_KEYS.FLOW, JSON.stringify(flow))
    } catch (error) {
      console.error("Error saving to local storage:", error)
    }
  }, [nodes, edges, reactFlowInstance])

  // Update existing nodes when schema changes
  useEffect(() => {
    if (schema.length === 0) return

    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        data: applySchemaToNodeData({ ...node.data }, schema)
      }))
    )
  }, [schema, setNodes])

  // Keep selected elements in sync with nodes and edges
  useEffect(() => {
    setSelectedElements((prev) => ({
      nodes: prev.nodes.map(
        (node) => nodes.find((n) => n.id === node.id) || node
      ),
      edges: prev.edges.map(
        (edge) => edges.find((e) => e.id === edge.id) || edge
      ),
    }))
  }, [nodes, edges])

  // Handle connections between nodes
  const onConnect = useCallback(
    async (params: Connection) => {
      // Create a new edge with a label and directional marker
      const newEdge = {
        ...params,
        type: "custom",
        animated: false,
        data: {
          label: "Exit",
          description: "A path leading to another room",
          aliases: [], // Add empty aliases array by default
          // Add a field for the API ID
          api_id: undefined as number | undefined
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: "#888",
        },
      }

      // Update the marker color to match the edge color
      if (newEdge.data?.label) {
        const color = getEdgeColorByLabel(newEdge.data.label)
        if (newEdge.markerEnd && typeof newEdge.markerEnd !== "string") {
          newEdge.markerEnd.color = color
        }
      }
      
      try {
        // Find source and target nodes
        const sourceNode = nodes.find(node => node.id === params.source);
        const targetNode = nodes.find(node => node.id === params.target);
        
        if (sourceNode && targetNode) {
          // Check if the nodes have API IDs (meaning they exist in the backend)
          const sourceApiId = sourceNode.data.api_id || sourceNode.id;
          const targetApiId = targetNode.data.api_id || targetNode.id;
          
          // Create exit in API
          const apiExit = await createExitInApi({
            name: newEdge.data.label,
            description: newEdge.data.description,
            source_id: sourceApiId.toString(),
            destination_id: targetApiId.toString(),
            attributes: Object.entries(newEdge.data || {})
              .filter(([key]) => key.startsWith('attr_'))
              .reduce((acc, [key, value]) => ({
                ...acc,
                [key.replace('attr_', '')]: String(value)
              }), {})
          });
          
          // Update edge with API data
          newEdge.data.api_id = apiExit.id;
          
          toast({
            title: "Exit Created",
            description: `Exit "${newEdge.data.label}" created successfully`,
          });
        }
      } catch (error) {
        console.error("Failed to create exit:", error);
        
        toast({
          title: "API Error",
          description: "Exit created locally only. Failed to create in MUD.",
          variant: "destructive",
        });
      }

      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges, nodes, toast],
  )

  // Add a new node to the diagram
  const onAddNode = useCallback(async () => {
    const newNodeId = `${nodes.length + 1}`

    // Create basic node data with index signature for dynamic attributes
    const nodeData: {
      label: string;
      description?: string;
      [key: string]: any;
    } = {
      label: `Room ${newNodeId}`,
      description: "A new room with no description yet."
    }

    // Apply schema attributes to node data
    const nodeWithSchema = applySchemaToNodeData(nodeData, schema)

    try {
      // Create room in the API
      const apiRoom = await createRoomInApi({
        name: nodeData.label,
        description: nodeData.description || "",
        attributes: Object.entries(nodeWithSchema)
          .filter(([key]) => key.startsWith('attr_'))
          .reduce((acc, [key, value]) => ({
            ...acc,
            [key.replace('attr_', '')]: String(value)
          }), {})
      });

      // Use the API-generated ID if available
      const roomId = apiRoom.id?.toString() || newNodeId;

      const newNode: Node = {
        id: roomId,
        type: "custom",
        data: {
          ...nodeWithSchema,
          api_id: apiRoom.id, // Store the API ID for future reference
        },
        position: {
          x: Math.random() * 500,
          y: Math.random() * 500,
        },
      }
      
      setNodes((nds) => nds.concat(newNode));
      
      toast({
        title: "Room Created",
        description: `Room "${nodeData.label}" created with ID ${roomId}`,
      });
    } catch (error) {
      console.error("Failed to create room:", error);
      
      // Create node locally even if API fails
      const newNode: Node = {
        id: newNodeId,
        type: "custom",
        data: nodeWithSchema,
        position: {
          x: Math.random() * 500,
          y: Math.random() * 500,
        },
      }
      
      setNodes((nds) => nds.concat(newNode));
      
      toast({
        title: "API Error",
        description: "Room created locally only. Failed to create in MUD.",
        variant: "destructive",
      });
    }
  }, [nodes, setNodes, schema, toast])

  // Handle connection end - add node on edge drop when connection isn't valid
  const onConnectEnd = useCallback(
    async (event: MouseEvent | TouchEvent) => {
      // Check if the event has a valid source but was dropped in an empty area
      const targetIsPane = (event.target as HTMLElement).classList.contains('react-flow__pane');

      if (targetIsPane && reactFlowWrapper.current && reactFlowInstance) {
        // Get the connection start
        const connStartElement = document.querySelector('.react-flow__connection-source');
        if (!connStartElement) return;

        // Get source node id from connection start element
        const sourceNodeId = connStartElement.getAttribute('data-nodeid');
        if (!sourceNodeId) return;

        // Get source handle id from connection start element
        const sourceHandleId = connStartElement.getAttribute('data-handleid');

        // Get position from event
        const { clientX, clientY } =
          'touches' in event ? event.touches[0] : event;

        // Get the position relative to the flow container
        const { top, left } = reactFlowWrapper.current.getBoundingClientRect();

        // Generate new node id for temporary use
        const tempNodeId = `${nodes.length + 1}`;

        // Create position using screenToFlowPosition to convert screen to flow coordinates
        const position = reactFlowInstance.project({
          x: clientX - left,
          y: clientY - top,
        });

        // Create basic node data with index signature for dynamic attributes
        const nodeData: {
          label: string;
          description?: string;
          [key: string]: any;
        } = {
          label: `Room ${tempNodeId}`,
          description: "A new room with no description yet."
        };

        // Apply schema attributes to node data
        const nodeWithSchema = applySchemaToNodeData(nodeData, schema);

        try {
          // Create room in the API
          const apiRoom = await createRoomInApi({
            name: nodeData.label,
            description: nodeData.description || "",
            attributes: Object.entries(nodeWithSchema)
              .filter(([key]) => key.startsWith('attr_'))
              .reduce((acc, [key, value]) => ({
                ...acc,
                [key.replace('attr_', '')]: String(value)
              }), {})
          });

          // Use the API-generated ID if available
          const newNodeId = apiRoom.id?.toString() || tempNodeId;

          // Create new node with API ID
          const newNode: Node = {
            id: newNodeId,
            type: "custom",
            data: {
              ...nodeWithSchema,
              api_id: apiRoom.id, // Store the API ID for future reference
            },
            position: position,
          };

          // Create new edge connecting from source to new node
          const newEdge = {
            id: `e-${sourceNodeId}-${newNodeId}`,
            source: sourceNodeId,
            target: newNodeId,
            sourceHandle: sourceHandleId || undefined,
            type: "custom",
            animated: false,
            data: {
              label: "Exit",
              description: "A path leading to another room",
              aliases: [], // Add empty aliases array by default
              api_id: undefined as number | undefined
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "#888",
            },
          };

          // Try to create the exit in the API
          try {
            // Find source node
            const sourceNode = nodes.find(node => node.id === sourceNodeId);
            
            if (sourceNode) {
              // Get the API ID or use node ID as fallback
              const sourceApiId = sourceNode.data.api_id || sourceNode.id;
              
              // Create exit in API
              const apiExit = await createExitInApi({
                name: newEdge.data.label,
                description: newEdge.data.description,
                source_id: sourceApiId.toString(),
                destination_id: apiRoom.id.toString(),
                attributes: Object.entries(newEdge.data || {})
                  .filter(([key]) => key.startsWith('attr_'))
                  .reduce((acc, [key, value]) => ({
                    ...acc,
                    [key.replace('attr_', '')]: String(value)
                  }), {})
              });
              
              // Update edge with API data
              newEdge.data.api_id = apiExit.id;
            }
          } catch (error) {
            console.error("Failed to create exit:", error);
            // Continue anyway, the room and edge were created locally
          }

          // Add new node and edge
          setNodes((nds) => nds.concat(newNode));
          setEdges((eds) => eds.concat(newEdge));

          toast({
            title: "Room Created",
            description: `Room "${nodeData.label}" created with ID ${newNodeId}`,
          });
        } catch (error) {
          console.error("Failed to create room:", error);
          
          // Create node locally even if API fails
          const newNode: Node = {
            id: tempNodeId,
            type: "custom",
            data: nodeWithSchema,
            position: position,
          };

          // Create new edge connecting from source to new node
          const newEdge = {
            id: `e-${sourceNodeId}-${tempNodeId}`,
            source: sourceNodeId,
            target: tempNodeId,
            sourceHandle: sourceHandleId || undefined,
            type: "custom",
            animated: false,
            data: {
              label: "Exit",
              aliases: [], // Add empty aliases array by default
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "#888",
            },
          };

          // Add new node and edge
          setNodes((nds) => nds.concat(newNode));
          setEdges((eds) => eds.concat(newEdge));
          
          toast({
            title: "API Error",
            description: "Room created locally only. Failed to create in MUD.",
            variant: "destructive",
          });
        }
      }
    },
    [nodes, setNodes, setEdges, reactFlowInstance, schema, toast]
  );

  // Track selected elements
  const onSelectionChange = useCallback(({ nodes, edges }: OnSelectionChangeParams) => {
    setSelectedElements({
      nodes: nodes,
      edges: edges,
    })
  }, [])

  // Delete selected elements
  const onDeleteSelected = useCallback(async () => {
    // Track API deletion promises
    const deletionPromises: Promise<any>[] = [];
    
    // Try to delete nodes in API
    for (const node of selectedElements.nodes) {
      if (node.data.api_id) {
        deletionPromises.push(
          deleteRoomFromApi(node.data.api_id).catch(err => {
            console.error(`Failed to delete room ${node.id} from API:`, err);
            // We'll continue with local deletion even if API deletion fails
          })
        );
      }
    }
    
    // Try to delete edges in API
    for (const edge of selectedElements.edges) {
      if (edge.data?.api_id) {
        deletionPromises.push(
          deleteExitFromApi(edge.data.api_id).catch(err => {
            console.error(`Failed to delete exit ${edge.id} from API:`, err);
            // We'll continue with local deletion even if API deletion fails
          })
        );
      }
    }
    
    // Wait for all API deletion attempts to complete (success or failure)
    if (deletionPromises.length > 0) {
      try {
        await Promise.allSettled(deletionPromises);
        toast({
          title: "Elements Deleted",
          description: `Deleted ${deletionPromises.length} elements from the MUD`,
        });
      } catch (error) {
        console.error("Error during deletion:", error);
        toast({
          title: "API Error",
          description: "Some elements may not have been deleted from the MUD",
          variant: "destructive",
        });
      }
    }
    
    // Always delete from local state
    setNodes((nds) => nds.filter((node) => !selectedElements.nodes.find(n => n.id === node.id)));
    setEdges((eds) => eds.filter((edge) => !selectedElements.edges.find(e => e.id === edge.id)));
  }, [selectedElements, setNodes, setEdges, toast]);

  // Clear the diagram
  const onClear = useCallback(() => {
    setNodes([])
    setEdges([])
  }, [setNodes, setEdges])

  // Reset to default
  const onReset = useCallback(() => {
    if (!reactFlowInstance) return

    // Instead of using fromObject which is not available, directly set nodes and edges
    setNodes(defaultNodes);
    setEdges(defaultEdges);
  }, [reactFlowInstance, setNodes, setEdges])

  // Download diagram data as JSON
  const onDownload = useCallback(() => {
    try {
      const data = {
        nodes,
        edges,
      }
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "flow-diagram.json"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading diagram:", error)
    }
  }, [nodes, edges])

  // Download simplified diagram data as JSON
  const onSimpleDownload = useCallback(() => {
    try {
      // Create simplified versions of nodes and edges
      const simplifiedNodes = nodes.map(node => {
        // Extract attributes (keys starting with attr_)
        const attributes = Object.entries(node.data)
          .filter(([key]) => key.startsWith('attr_'))
          .reduce((acc, [key, value]) => ({
            ...acc,
            [key.replace('attr_', '')]: value
          }), {})

        return {
          id: node.id,
          name: node.data.label,
          description: node.data.description,
          attributes: attributes
        }
      })

      const simplifiedEdges = edges.map(edge => {
        // Extract attributes (keys starting with attr_)
        const attributes = Object.entries(edge.data || {})
          .filter(([key]) => key.startsWith('attr_'))
          .reduce((acc, [key, value]) => ({
            ...acc,
            [key.replace('attr_', '')]: value
          }), {})

        return {
          from: edge.source,
          to: edge.target,
          relationship: edge.data?.label,
          description: edge.data?.description,
          attributes: attributes
        }
      })

      const data = {
        nodes: simplifiedNodes,
        relationships: simplifiedEdges,
      }

      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "flow-diagram-simple.json"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading simplified diagram:", error)
    }
  }, [nodes, edges])

  // Download as Evennia batch code
  const onEvenniaBatchDownload = useCallback(() => {
    try {
      // Create simplified versions of nodes and edges - same as onSimpleDownload
      const simplifiedNodes = nodes.map(node => {
        const attributes = Object.entries(node.data)
          .filter(([key]) => key.startsWith('attr_'))
          .reduce((acc, [key, value]) => ({
            ...acc,
            [key.replace('attr_', '')]: value
          }), {})

        return {
          id: node.id,
          name: node.data.label,
          description: node.data.description,
          attributes: attributes
        }
      })

      const simplifiedEdges = edges.map(edge => {
        const attributes = Object.entries(edge.data || {})
          .filter(([key]) => key.startsWith('attr_'))
          .reduce((acc, [key, value]) => ({
            ...acc,
            [key.replace('attr_', '')]: value
          }), {})

        return {
          from: edge.source,
          to: edge.target,
          relationship: edge.data?.label,
          description: edge.data?.description,
          attributes: attributes
        }
      })

      const data = {
        nodes: simplifiedNodes,
        relationships: simplifiedEdges,
      }

      // Convert to Evennia batch code
      const batchCode = convertJsonToEvenniaBatchCode(data)
      
      // Download the batch code as a .py file
      const blob = new Blob([batchCode], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "flow-diagram.py"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading Evennia batch code:", error)
    }
  }, [nodes, edges])

  // Fetch rooms from API
  const loadRooms = useCallback(async () => {
    try {
      const startRoomId = prompt("Enter start room ID:", "1")
      if (!startRoomId) return
      
      const depth = prompt("Enter depth (1-3):", "1")
      if (!depth) return
      
      // Validate inputs
      const roomId = parseInt(startRoomId, 10)
      const depthNum = parseInt(depth, 10)
      
      if (isNaN(roomId) || roomId <= 0) {
        toast({
          title: "Invalid Input",
          description: "Room ID must be a positive number",
          variant: "destructive",
        })
        return
      }
      
      if (isNaN(depthNum) || depthNum < 1 || depthNum > 3) {
        toast({
          title: "Invalid Input",
          description: "Depth must be between 1 and 3",
          variant: "destructive",
        })
        return
      }
      
      toast({
        title: "Loading",
        description: `Fetching rooms starting from ID ${roomId} with depth ${depthNum}...`,
      })
      
      const data = await roomApi.fetchRoomGraph(roomId, depthNum);
      
      // Validate response data structure
      if (!data || !data.rooms || !data.exits) {
        throw new Error("Invalid response format from server")
      }
      
      if (Object.keys(data.rooms).length === 0) {
        toast({
          title: "No rooms found",
          description: `No rooms found with ID ${roomId}`,
          variant: "destructive",
        })
        return
      }
      
      // Get existing node and edge IDs to avoid duplicates
      const existingNodeIds = new Set(nodes.map(node => node.id))
      const existingEdgeIds = new Set(edges.map(edge => edge.id))
      
      // Process rooms and exits to create nodes and edges
      const newNodes: Node[] = []
      const newEdges: Edge[] = []
      
      // Add rooms as nodes
      Object.values(data.rooms).forEach((room: any) => {
        try {
          const roomId = room.id.toString()
          
          // Skip if this room already exists
          if (existingNodeIds.has(roomId)) {
            return
          }
          
          const roomNode: Node = {
            id: roomId,
            type: "custom",
            data: { 
              label: room.name || `Room ${room.id}`,
              description: room.attributes?.desc || "",
              api_id: room.id, // Store the API ID
              // Add any other room attributes prefixed with attr_
              ...Object.entries(room.attributes || {}).reduce((acc, [key, value]) => ({
                ...acc,
                [`attr_${key}`]: value
              }), {})
            },
            position: {
              x: Math.random() * 800,
              y: Math.random() * 600,
            },
          }
          newNodes.push(roomNode)
          existingNodeIds.add(roomId) // Add to existing set to track
        } catch (err) {
          console.error("Error processing room:", err, room)
        }
      })
      
      // Add exits as edges
      Object.values(data.exits).forEach((exit: any) => {
        try {
          const edgeId = `e${exit.id}`
          
          // Skip if this exit already exists
          if (existingEdgeIds.has(edgeId)) {
            return
          }
          
          const sourceId = exit.source_id.toString()
          const targetId = exit.destination_id.toString()
          
          // Check if both source and target rooms exist (either in existing nodes or new nodes)
          const sourceExists = existingNodeIds.has(sourceId)
          const targetExists = existingNodeIds.has(targetId)
          
          if (!sourceExists || !targetExists) {
            console.warn(`Skipping exit ${exit.id}: Missing source or target room`)
            return
          }
          
          // Create edge without hardcoded handles - we'll set them dynamically later
          const newEdge: Edge = {
            id: edgeId,
            source: sourceId,
            target: targetId,
            type: "custom",
            data: {
              label: exit.name || "Exit",
              description: exit.attributes?.desc || "",
              api_id: exit.id, // Store the API ID
              // Add any other exit attributes prefixed with attr_
              ...Object.entries(exit.attributes || {}).reduce((acc, [key, value]) => ({
                ...acc,
                [`attr_${key}`]: value
              }), {})
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "#3b82f6",
            },
          }
          newEdges.push(newEdge)
          existingEdgeIds.add(edgeId) // Add to existing set to track
        } catch (err) {
          console.error("Error processing exit:", err, exit)
        }
      })
      
      if (newNodes.length === 0 && newEdges.length === 0) {
        toast({
          title: "No new rooms or exits",
          description: "All rooms and exits already exist in the diagram",
        })
        return
      }
      
      // Create a combined set of all nodes (existing + new)
      const allNodes = [...nodes, ...newNodes]
      const allEdges = [...edges, ...newEdges]
      
      // Apply auto-layout to position new nodes in a more organized way
      // ... (keep positioning code similar to original function)
      
      // Apply auto-layout to position nodes in a more organized way
      const nodePositions: Record<string, {x: number, y: number}> = {}
      
      // Create a basic graph representation to find root nodes
      const graphIn: Record<string, string[]> = {}
      const graphOut: Record<string, string[]> = {}
      
      // Initialize empty arrays for each node
      allNodes.forEach(node => {
        graphIn[node.id] = []
        graphOut[node.id] = []
        
        // Store existing node positions
        if (nodes.find(n => n.id === node.id)) {
          nodePositions[node.id] = node.position
        }
      })
      
      // Fill in graph connections
      allEdges.forEach(edge => {
        graphOut[edge.source].push(edge.target)
        graphIn[edge.target].push(edge.source)
      })
      
      // Find root nodes (nodes with no incoming edges or the first one if all have incoming)
      const newRootNodeIds: string[] = []
      const startNodeId = data.rooms[startRoomId] ? startRoomId.toString() : null
      
      if (startNodeId) {
        // If the requested start node exists, start with it
        newRootNodeIds.push(startNodeId)
      } else {
        // Otherwise find nodes without incoming connections among the new nodes
        newNodes.forEach(node => {
          if (graphIn[node.id].length === 0) {
            newRootNodeIds.push(node.id)
          }
        })
        
        // If no root nodes found (circular graph), just pick the first node
        if (newRootNodeIds.length === 0 && newNodes.length > 0) {
          newRootNodeIds.push(newNodes[0].id)
        }
      }
      
      // Width and height settings for layout
      const horizontalSpacing = 300
      const verticalSpacing = 200
      
      // Position nodes in a relative structure based on connections
      // For each new root node, find the closest existing node to anchor it
      newRootNodeIds.forEach(nodeId => {
        if (nodePositions[nodeId]) return // Skip if already positioned
        
        // If this node is connected to existing nodes, position it relative to them
        const connectedExistingNodes = [...graphIn[nodeId], ...graphOut[nodeId]]
          .filter(id => nodes.some(n => n.id === id))
        
        if (connectedExistingNodes.length > 0) {
          // Find the first connected existing node with a position
          const connectedId = connectedExistingNodes.find(id => nodePositions[id]) || connectedExistingNodes[0]
          
          if (nodePositions[connectedId]) {
            // Position relative to the connected node
            const { x, y } = nodePositions[connectedId]
            nodePositions[nodeId] = { x: x + horizontalSpacing, y: y }
          } else {
            // Fallback if connected node has no position yet
            nodePositions[nodeId] = { x: Math.random() * 800, y: Math.random() * 600 }
          }
        } else {
          // If not connected to existing nodes, position at a default location
          // Find empty space in the diagram
          const existingXs = Object.values(nodePositions).map(pos => pos.x)
          const maxX = existingXs.length ? Math.max(...existingXs) : 0
          nodePositions[nodeId] = { x: maxX + horizontalSpacing, y: 100 }
        }
      })
      
      // For remaining new nodes, position them based on connections
      const positionedIds = new Set(Object.keys(nodePositions))
      const remainingNewNodes = newNodes.filter(node => !positionedIds.has(node.id))
      
      // Use BFS to position connected nodes
      const queue = [...newRootNodeIds]
      while (queue.length > 0 && remainingNewNodes.length > 0) {
        const currentId = queue.shift()!
        if (!nodePositions[currentId]) continue
        
        // Process children (connected nodes)
        const children = graphOut[currentId]?.filter(id => !positionedIds.has(id)) || []
        
        if (children.length > 0) {
          // Position children in a semicircle around the parent
          const parentPos = nodePositions[currentId]
          const radius = horizontalSpacing
          
          children.forEach((childId, index) => {
            const angle = (Math.PI / (children.length + 1)) * (index + 1)
            const x = parentPos.x + radius * Math.cos(angle)
            const y = parentPos.y + radius * Math.sin(angle)
            
            nodePositions[childId] = { x, y }
            positionedIds.add(childId)
            queue.push(childId)
          })
        }
      }
      
      // Position any remaining nodes that weren't placed by BFS
      remainingNewNodes.filter(node => !positionedIds.has(node.id)).forEach(node => {
        // Find empty space for this node
        const existingXs = Object.values(nodePositions).map(pos => pos.x)
        const existingYs = Object.values(nodePositions).map(pos => pos.y)
        const maxX = existingXs.length ? Math.max(...existingXs) : 0
        const maxY = existingYs.length ? Math.max(...existingYs) : 0
        
        nodePositions[node.id] = { x: maxX + 150, y: maxY + 150 }
      })
      
      // Apply positions to new nodes
      const positionedNewNodes = newNodes.map(node => ({
        ...node,
        position: nodePositions[node.id] || { x: Math.random() * 800, y: Math.random() * 600 }
      }))
      
      // Now that we have positions, assign handles to new edges
      const enhancedNewEdges = newEdges.map(edge => {
        const sourcePos = nodePositions[edge.source]
        const targetPos = nodePositions[edge.target]
        
        if (sourcePos && targetPos) {
          // Determine direction based on relative positions
          const xDiff = targetPos.x - sourcePos.x
          const yDiff = targetPos.y - sourcePos.y
          
          let sourceHandle, targetHandle
          
          // Check if there's a reverse edge (bidirectional connection)
          const hasReverseEdge = allEdges.some(e => 
            e.source === edge.target && e.target === edge.source
          )
          
          // For horizontal layouts
          if (Math.abs(xDiff) >= Math.abs(yDiff)) {
            if (xDiff > 0) {
              // Target is to the right
              sourceHandle = "right-source"
              targetHandle = "left-target"
            } else {
              // Target is to the left
              sourceHandle = "left-source"
              targetHandle = "right-target"
            }
            
            // For bidirectional edges, offset one slightly to avoid overlap
            if (hasReverseEdge && edge.source > edge.target) {
              // This is the "return" edge, offset it
              if (yDiff >= 0) {
                // Offset edges upward
                sourceHandle = "top-source"
                targetHandle = "top-target"
              } else {
                // Offset edges downward
                sourceHandle = "bottom-source"
                targetHandle = "bottom-target"
              }
            }
          } 
          // For vertical layouts
          else {
            if (yDiff > 0) {
              // Target is below
              sourceHandle = "bottom-source"
              targetHandle = "top-target"
            } else {
              // Target is above
              sourceHandle = "top-source"
              targetHandle = "bottom-target"
            }
            
            // For bidirectional edges, offset one slightly to avoid overlap
            if (hasReverseEdge && edge.source > edge.target) {
              // This is the "return" edge, offset it
              if (xDiff >= 0) {
                // Offset edges to the right
                sourceHandle = "right-source"
                targetHandle = "right-target"
              } else {
                // Offset edges to the left
                sourceHandle = "left-source"
                targetHandle = "left-target"
              }
            }
          }
          
          return {
            ...edge,
            sourceHandle,
            targetHandle
          }
        }
        
        return edge
      })
      
      // Merge existing nodes/edges with new ones
      setNodes([...nodes, ...positionedNewNodes])
      setEdges([...edges, ...enhancedNewEdges])
      
      // Notify user
      toast({
        title: "Rooms loaded",
        description: `Added ${positionedNewNodes.length} new rooms and ${enhancedNewEdges.length} new exits`,
      })
      
      // Auto-arrange the layout
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.2 })
        }, 100)
      }
    } catch (error) {
      console.error("Error loading rooms:", error)
      toast({
        title: "Error",
        description: `Failed to load rooms: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    }
  }, [nodes, edges, setNodes, setEdges, reactFlowInstance, toast])

  return (
    <ResizablePanelGroup direction="horizontal" className="w-full h-full">
      <ResizablePanel defaultSize={75} minSize={30}>
        <div className="w-full h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onSelectionChange={onSelectionChange}
            connectOnClick={true}
            snapToGrid={true}
            snapGrid={[15, 15]}
            multiSelectionKeyCode="Shift"
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Panel position="top-right" className="flex gap-2">
              <Button onClick={onAddNode} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Node
              </Button>
              <Button onClick={loadRooms} variant="outline" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Load Rooms
              </Button>
              <Button onClick={onClear} variant="outline">
                Clear All
              </Button>
              <Button onClick={onReset} variant="outline">
                Reset
              </Button>
              <Button onClick={onDownload} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Save To Your Computer
              </Button>
              <Button onClick={onSimpleDownload} variant="outline" className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Export JSON
              </Button>
              <Button onClick={onEvenniaBatchDownload} variant="outline" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Export Evennia
              </Button>
            </Panel>
          </ReactFlow>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={25} minSize={15}>
        <PropertySidebar
          selectedNode={selectedElements.nodes[0]}
          selectedEdge={selectedElements.edges[0]}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default function FlowDiagram() {
  return (
    <div className="w-full h-full border rounded-lg overflow-hidden bg-background">
      <ReactFlowProvider>
        <FlowDiagramInner />
      </ReactFlowProvider>
    </div>
  )
}

