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
import { Plus, Trash2, Download, FileJson, Code } from "lucide-react"
import CustomNode from "./custom-node"
import CustomEdge from "./custom-edge"
import PropertySidebar from "./property-sidebar"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useAttributeSchema } from "@/hooks/use-attribute-schema"
import { AttributeSchemaItem } from "@/components/attribute-schema-modal"
import { convertJsonToEvenniaBatchCode } from "@/lib/batchCodeConverter"

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

const FlowDiagramInner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(loadFromStorage().nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadFromStorage().edges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [selectedElements, setSelectedElements] = useState<{
    nodes: Node[]
    edges: Edge[]
  }>({
    nodes: [],
    edges: [],
  })
  const { screenToFlowPosition } = useReactFlow()
  // Get schema at the component level, not inside a callback
  const { schema } = useAttributeSchema()

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
    (params: Connection) => {
      // Create a new edge with a label and directional marker
      const newEdge = {
        ...params,
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
      }

      // Update the marker color to match the edge color
      if (newEdge.data?.label) {
        const color = getEdgeColorByLabel(newEdge.data.label)
        if (newEdge.markerEnd && typeof newEdge.markerEnd !== "string") {
          newEdge.markerEnd.color = color
        }
      }

      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges],
  )

  // Add a new node to the diagram
  const onAddNode = useCallback(() => {
    const newNodeId = `${nodes.length + 1}`

    // Create basic node data with index signature for dynamic attributes
    const nodeData: {
      label: string;
      [key: string]: any;
    } = {
      label: `Room ${newNodeId}`,
    }

    // Apply schema attributes to node data
    const nodeWithSchema = applySchemaToNodeData(nodeData, schema)

    const newNode: Node = {
      id: newNodeId,
      type: "custom",
      data: nodeWithSchema,
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
    }
    setNodes((nds) => nds.concat(newNode))
  }, [nodes, setNodes, schema])

  // Handle connection end - add node on edge drop when connection isn't valid
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
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

        // Generate new node id
        const newNodeId = `${nodes.length + 1}`;

        // Create position using screenToFlowPosition to convert screen to flow coordinates
        const position = reactFlowInstance.project({
          x: clientX - left,
          y: clientY - top,
        });

        // Create basic node data with index signature for dynamic attributes
        const nodeData: {
          label: string;
          [key: string]: any;
        } = {
          label: `Room ${newNodeId}`,
        };

        // Apply schema attributes to node data
        const nodeWithSchema = applySchemaToNodeData(nodeData, schema);

        // Create new node
        const newNode: Node = {
          id: newNodeId,
          type: "custom",
          data: nodeWithSchema,
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
      }
    },
    [nodes, setNodes, setEdges, reactFlowInstance, schema]
  );

  // Track selected elements
  const onSelectionChange = useCallback(({ nodes, edges }: OnSelectionChangeParams) => {
    setSelectedElements({
      nodes: nodes,
      edges: edges,
    })
  }, [])

  // Delete selected elements
  const onDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !selectedElements.nodes.find(n => n.id === node.id)))
    setEdges((eds) => eds.filter((edge) => !selectedElements.edges.find(e => e.id === edge.id)))
  }, [selectedElements, setNodes, setEdges])

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

