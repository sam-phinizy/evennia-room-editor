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
  reconnectEdge,
} from "reactflow"
import "reactflow/dist/style.css"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Download, FileJson, Code, Database, Settings } from "lucide-react"
import CustomNode from "./custom-node"
import CustomEdge from "./custom-edge"
import PropertySidebar from "./property-sidebar"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useAttributeSchema } from "@/hooks/use-attribute-schema"
import { AttributeSchemaItem } from "@/components/attribute-schema-modal"
import { convertJsonToEvenniaBatchCode } from "@/lib/batchCodeConverter"
import { useToast } from "@/components/ui/use-toast"
import { roomApi, exitApi, type RoomResponse, type ExitResponse } from "@/lib/api-service"
import LoadRoomsModal from "./load-rooms-modal"
import { useServerConnection } from "@/hooks/use-server-connection"
import ShowHiddenRooms from "./show-hidden-rooms"
import SettingsModal from "./settings-modal"
import { createRoomInApi, createExitInApi, deleteRoomFromApi, deleteExitFromApi } from "@/lib/api-utils"

// Storage keys
const STORAGE_KEYS = {
  FLOW: "flow-diagram-flow",
} as const

// Default nodes if nothing in storage
const defaultNodes: Node[] = []

// Default edges if nothing in storage
const defaultEdges: Edge[] = []

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

// Load data from local storage
const loadFromStorage = () => {
  if (typeof window === "undefined") return { nodes: [], edges: [] }

  try {
    const flowJson = localStorage.getItem(STORAGE_KEYS.FLOW)
    if (!flowJson) return { nodes: [], edges: [] }

    const flow = JSON.parse(flowJson)
    return {
      nodes: flow.nodes || [],
      edges: flow.edges || [],
    }
  } catch (error) {
    console.error("Error loading from local storage:", error)
    return { nodes: [], edges: [] }
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
  const [loadRoomsModalOpen, setLoadRoomsModalOpen] = useState(false)
  const { screenToFlowPosition } = useReactFlow()
  // Get schema at the component level, not inside a callback
  const { schema } = useAttributeSchema()
  const { toast } = useToast()
  const { isConnected, enabled } = useServerConnection()
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)

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

  // Add onReconnect handler
  const onReconnect = useCallback(
    async (oldEdge: Edge, newConnection: Connection) => {
      // Check if the source or target has actually changed
      if (oldEdge.source === newConnection.source && oldEdge.target === newConnection.target) {
        // If nothing changed, just update the handles
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
        return;
      }

      try {
        // Find source and target nodes for the new connection
        const sourceNode = nodes.find(node => node.id === newConnection.source);
        const targetNode = nodes.find(node => node.id === newConnection.target);
        
        if (sourceNode && targetNode && oldEdge.data?.api_id) {
          // First delete the old exit
          await deleteExitFromApi(oldEdge.data.api_id);
          
          // Get API IDs for the new connection
          const sourceApiId = sourceNode.data.api_id || sourceNode.id;
          const targetApiId = targetNode.data.api_id || targetNode.id;
          
          // Create new exit in API
          const apiExit = await createExitInApi({
            name: oldEdge.data?.label || "Exit",
            description: oldEdge.data?.description || "A path leading to another room",
            source_id: sourceApiId.toString(),
            destination_id: targetApiId.toString(),
            attributes: Object.entries(oldEdge.data || {})
              .filter(([key]) => key.startsWith('attr_'))
              .reduce((acc, [key, value]) => ({
                ...acc,
                [key.replace('attr_', '')]: String(value)
              }), {})
          });
          
          // Update the edge data with the new API ID
          const updatedEdge: Edge = {
            ...oldEdge,
            source: newConnection.source || oldEdge.source,
            target: newConnection.target || oldEdge.target,
            sourceHandle: newConnection.sourceHandle || undefined,
            targetHandle: newConnection.targetHandle || undefined,
            data: {
              ...oldEdge.data,
              api_id: apiExit.id
            }
          };
          
          // Update edges with the reconnected edge
          setEdges((els) => els.map(e => e.id === oldEdge.id ? updatedEdge : e));
          
          toast({
            title: "Exit Updated",
            description: "Exit connection updated successfully",
          });
        } else {
          // If no API IDs involved, just update the local state
          setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
        }
      } catch (error) {
        console.error("Failed to update exit connection:", error);
        
        // Revert to original connection
        toast({
          title: "API Error",
          description: "Failed to update exit connection in MUD",
          variant: "destructive",
        });
        
        // Revert the edge to its original state
        setEdges((els) => els.map(e => e.id === oldEdge.id ? oldEdge : e));
      }
    },
    [nodes, setEdges, toast]
  );

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
  const loadRooms = useCallback(async (roomId: number, depth: number) => {
    try {
      // Validate inputs
      if (roomId <= 0) {
        toast({
          title: "Invalid Input",
          description: "Room ID must be a positive number",
          variant: "destructive",
        })
        return
      }
      
      if (depth < 1 || depth > 3) {
        toast({
          title: "Invalid Input",
          description: "Depth must be between 1 and 3",
          variant: "destructive",
        })
        return
      }
      
      toast({
        title: "Loading",
        description: `Fetching rooms starting from ID ${roomId} with depth ${depth}...`,
      })
      
      const data = await roomApi.readRoomGraph(roomId, depth);
      
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
      const startNodeId = data.rooms[roomId] ? roomId.toString() : null
      
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
            onReconnect={onReconnect}
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
              <Button 
                onClick={() => setSettingsModalOpen(true)} 
                variant="outline" 
                size="icon" 
                className="rounded-full h-10 w-10" 
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button onClick={onAddNode} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Room
              </Button>
              {isConnected && enabled ? (
                <Button onClick={() => setLoadRoomsModalOpen(true)} variant="outline" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Load Rooms
                </Button>
              ) : (
                <ShowHiddenRooms />
              )}
              <Button onClick={onClear} variant="outline">
                Clear All
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
      <LoadRoomsModal 
        open={loadRoomsModalOpen}
        onOpenChange={setLoadRoomsModalOpen}
        onLoadRooms={loadRooms}
      />
      <SettingsModal 
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
      />
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

