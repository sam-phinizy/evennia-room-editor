"use client"
import { type Node, type Edge, useReactFlow } from "reactflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, X, Copy, Settings, ChevronDown, ChevronsUpDown } from "lucide-react"
import { useCallback, useState } from "react"
import { useAttributeSchema, convertValueByType, getAttributeType, getAttributeChoices } from "@/hooks/use-attribute-schema"
import AttributeSchemaModal, { AttributeSchemaItem } from "./attribute-schema-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";
import SchemaEditor from "./schema-editor"
import { useToast } from "@/components/ui/use-toast"
import { roomApi, exitApi } from "@/lib/api-service"
import { useServerConnection } from "@/hooks/use-server-connection"

interface PropertySidebarProps {
  selectedNode?: Node | null
  selectedEdge?: Edge | null
}

interface Attribute {
  key: string
  value: string
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

// Update a room in the API
const updateRoomInApi = async (roomId: string | number, roomData: { 
  name: string; 
  description: string; 
  attributes?: Record<string, any>;
}) => {
  try {
    // Convert all attribute values to strings
    const stringAttributes = roomData.attributes 
      ? Object.entries(roomData.attributes).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: String(value)
        }), {})
      : {};
      
    const data = await roomApi.updateRoom({
      id: roomId,
      name: roomData.name,
      description: roomData.description || "",
      attributes: stringAttributes
    });
    return data;
  } catch (error) {
    console.error(`Error updating room ${roomId} in API:`, error);
    throw error;
  }
};

// Update an exit in the API
const updateExitInApi = async (exitId: string | number, exitData: {
  name: string;
  description?: string;
  attributes?: Record<string, any>;
}) => {
  try {
    // Convert all attribute values to strings
    const stringAttributes = exitData.attributes 
      ? Object.entries(exitData.attributes).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: String(value)
        }), {})
      : {};
      
    const data = await exitApi.updateExit({
      id: exitId,
      name: exitData.name,
      description: exitData.description || "",
      attributes: stringAttributes
    });
    return data;
  } catch (error) {
    console.error(`Error updating exit ${exitId} in API:`, error);
    throw error;
  }
};

// Connection Settings Panel component
function ConnectionSettingsPanel() {
  const { serverUrl, setServerUrl, isConnected, checkConnection, enabled, setEnabled } = useServerConnection()
  const { toast } = useToast()

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Connection Settings</h3>
      </div>
      <div className="border-t pt-4">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="server-url">Evennia Server URL</Label>
            <div className="flex items-center gap-2">
              <Input
                id="server-url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1"
              />
              <Button
                onClick={async () => {
                  const success = await checkConnection();
                  toast({
                    title: success ? "Connected" : "Failed to Connect",
                    description: success ? "Successfully connected to server" : "Could not connect to the server. Check the URL and make sure the server is running.",
                    variant: success ? "default" : "destructive",
                  });
                }}
                variant="outline"
                size="sm"
              >
                Test
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="enable-api" className="text-sm"> Online Mode</Label>
                <Switch 
                  id="enable-api" 
                  checked={enabled} 
                  onCheckedChange={setEnabled} 
                  disabled={!isConnected} 
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected && enabled 
                ? "Changes will be synced with your Evennia server" 
                : "Working in offline mode. Changes will only be saved locally."}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// Schema Configuration Panel component
function SchemaConfigurationPanel({ schema, onSchemaChange }: { schema: AttributeSchemaItem[], onSchemaChange: (schema: AttributeSchemaItem[]) => void }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Schema Configuration</h3>
      </div>
      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Define a schema of attributes that can be applied to nodes and edges.
          This helps maintain consistency across your diagram.
        </p>
        <SchemaEditor schema={schema} onSchemaChange={onSchemaChange} />
      </div>
    </>
  )
}

export default function PropertySidebar({ selectedNode, selectedEdge }: PropertySidebarProps) {
  const { setNodes, setEdges, getNode, getEdge } = useReactFlow()
  const [newAttributeKey, setNewAttributeKey] = useState("")
  const [newAttributeValue, setNewAttributeValue] = useState("")
  const [schemaModalOpen, setSchemaModalOpen] = useState(false)
  const { toast } = useToast()

  // Collapsible section states
  const [isBasicPropsOpen, setIsBasicPropsOpen] = useState(true)
  const [isAliasesOpen, setIsAliasesOpen] = useState(true)
  const [isTwoWayOpen, setIsTwoWayOpen] = useState(true)
  const [isAttributesOpen, setIsAttributesOpen] = useState(true)

  const [activeTab, setActiveTab] = useState("properties")
  const { schema, setSchema } = useAttributeSchema()
  const { serverUrl, setServerUrl, isConnected, checkConnection, enabled, setEnabled } = useServerConnection()

  const updateNodeData = useCallback(
    (key: string, value: string) => {
      if (!selectedNode) return

      // Update the node locally
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === selectedNode.id) {
            // If the key is an attribute (starts with attr_), handle type conversion
            if (key.startsWith("attr_")) {
              const attributeName = key.replace("attr_", "")
              const attributeType = getAttributeType(attributeName, schema)
              const convertedValue = convertValueByType(value, attributeType)

              return {
                ...node,
                data: {
                  ...node.data,
                  [key]: convertedValue,
                },
              }
            }

            return {
              ...node,
              data: {
                ...node.data,
                [key]: value,
              },
            }
          }
          return node
        }),
      )

      // If this node has an API ID, update it in the API as well
      if (selectedNode.data.api_id) {
        // Use a timeout to batch updates and avoid sending too many API requests
        const timeoutId = setTimeout(async () => {
          try {
            // Get the current node data after all local updates
            const currentNode = getNode(selectedNode.id);
            if (!currentNode) return;

            // Prepare room data for API
            const roomData = {
              name: currentNode.data.label || "",
              description: currentNode.data.description || "",
              attributes: Object.entries(currentNode.data)
                .filter(([key]) => key.startsWith('attr_'))
                .reduce((acc, [key, value]) => ({
                  ...acc,
                  [key.replace('attr_', '')]: value
                }), {})
            };

            // Update in API
            await updateRoomInApi(currentNode.data.api_id, roomData);
          } catch (error) {
            console.error("Failed to update room in API:", error);
            toast({
              title: "API Error",
              description: "Failed to update the room in the MUD",
              variant: "destructive",
            });
          }
        }, 500);  // 500ms debounce

        // Clean up timeout if component unmounts or another update happens
        return () => clearTimeout(timeoutId);
      }
    },
    [selectedNode, setNodes, schema, getNode, toast],
  )

  const updateEdgeData = useCallback(
    (key: string, value: any) => {
      if (!selectedEdge) return

      // Update the edge locally
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id === selectedEdge.id) {
            // If the key is an attribute (starts with attr_), handle type conversion
            if (key.startsWith("attr_")) {
              const attributeName = key.replace("attr_", "")
              const attributeType = getAttributeType(attributeName, schema)
              const convertedValue = convertValueByType(value, attributeType)

              return {
                ...edge,
                data: {
                  ...edge.data,
                  [key]: convertedValue,
                },
              }
            }

            // Special handling for aliases to ensure it's stored as an array
            if (key === "aliases") {
              return {
                ...edge,
                data: {
                  ...edge.data,
                  [key]: Array.isArray(value) ? value : value,
                },
              }
            }

            return {
              ...edge,
              data: {
                ...edge.data,
                [key]: value,
              },
            }
          }
          return edge
        }),
      )

      // If this edge has an API ID, update it in the API as well
      if (selectedEdge.data?.api_id) {
        // Use a timeout to batch updates and avoid sending too many API requests
        const timeoutId = setTimeout(async () => {
          try {
            // Get the current edge data after all local updates
            const currentEdge = getEdge(selectedEdge.id);
            if (!currentEdge || !currentEdge.data) return;

            // Prepare exit data for API
            const exitData = {
              name: currentEdge.data.label || "",
              description: currentEdge.data.description || "",
              attributes: Object.entries(currentEdge.data)
                .filter(([key]) => key.startsWith('attr_'))
                .reduce((acc, [key, value]) => ({
                  ...acc,
                  [key.replace('attr_', '')]: value
                }), {})
            };

            // Update in API
            await updateExitInApi(currentEdge.data.api_id, exitData);
          } catch (error) {
            console.error("Failed to update exit in API:", error);
            toast({
              title: "API Error",
              description: "Failed to update the exit in the MUD",
              variant: "destructive",
            });
          }
        }, 500);  // 500ms debounce

        // Clean up timeout if component unmounts or another update happens
        return () => clearTimeout(timeoutId);
      }
    },
    [selectedEdge, setEdges, schema, getEdge, toast],
  )

  const addAttribute = useCallback(() => {
    if (!newAttributeKey.trim()) return

    const updateFn = selectedNode ? updateNodeData : updateEdgeData
    updateFn(`attr_${newAttributeKey}`, newAttributeValue)
    setNewAttributeKey("")
    setNewAttributeValue("")
  }, [newAttributeKey, newAttributeValue, selectedNode, updateNodeData, updateEdgeData])

  const removeAttribute = useCallback(
    (key: string) => {
      if (!selectedNode && !selectedEdge) return

      if (selectedNode) {
        setNodes((nodes) =>
          nodes.map((node) => {
            if (node.id === selectedNode.id) {
              const { [key]: removed, ...rest } = node.data
              return {
                ...node,
                data: rest,
              }
            }
            return node
          }),
        )
      } else if (selectedEdge) {
        setEdges((edges) =>
          edges.map((edge) => {
            if (edge.id === selectedEdge.id) {
              const { [key]: removed, ...rest } = edge.data || {}
              return {
                ...edge,
                data: rest,
              }
            }
            return edge
          }),
        )
      }
    },
    [selectedNode, selectedEdge, setNodes, setEdges],
  )

  // Modify the getAttributes function to also return the attribute type and choices if available
  const getAttributes = useCallback((): (Attribute & { type: string, choices?: string[] })[] => {
    const data = selectedNode?.data || selectedEdge?.data || {}
    return Object.entries(data)
      .filter(([key]) => key.startsWith("attr_"))
      .map(([key, value]) => {
        const attributeName = key.replace("attr_", "")
        const attrType = getAttributeType(attributeName, schema)
        return {
          key: attributeName,
          value: String(value),
          type: attrType,
          choices: attrType === "choices" ? getAttributeChoices(attributeName, schema) : undefined
        }
      })
  }, [selectedNode, selectedEdge, schema])

  // Get a list of attribute names that are already used
  const getUsedAttributeNames = useCallback((): string[] => {
    const data = selectedNode?.data || selectedEdge?.data || {}
    return Object.keys(data)
      .filter(key => key.startsWith("attr_"))
      .map(key => key.replace("attr_", ""))
  }, [selectedNode, selectedEdge])

  // Filter schema to exclude already used attributes
  const getUnusedSchemaItems = useCallback((): AttributeSchemaItem[] => {
    const usedNames = getUsedAttributeNames()
    return schema.filter(item => !usedNames.includes(item.name))
  }, [schema, getUsedAttributeNames])

  const onDuplicate = useCallback(() => {
    if (selectedNode) {
      const node = getNode(selectedNode.id)
      if (!node) return

      // Create duplicate with new ID and position
      const newNode: Node = {
        ...node,
        id: `${node.id}-copy-${Date.now()}`,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: false,
      }

      // Apply schema attributes before adding
      const nodeCopy = { ...newNode };
      if (nodeCopy.data) {
        nodeCopy.data = applySchemaToNodeData({ ...nodeCopy.data }, schema);
      }

      // Add the node with schema attributes
      setNodes((nodes) => [...nodes, nodeCopy])

    } else if (selectedEdge) {
      const edge = getEdge(selectedEdge.id)
      if (!edge) return

      // Create duplicate with new ID
      const newEdge: Edge = {
        ...edge,
        id: `${edge.id}-copy-${Date.now()}`,
        selected: false,
      }

      // Apply schema attributes before adding
      const edgeCopy = { ...newEdge };
      if (edgeCopy.data) {
        edgeCopy.data = applySchemaToNodeData({ ...edgeCopy.data }, schema);
      }

      // Add the edge with schema attributes
      setEdges((edges) => [...edges, edgeCopy])
    }
  }, [selectedNode, selectedEdge, getNode, getEdge, setNodes, setEdges, schema])

  const handleSchemaChange = (newSchema: AttributeSchemaItem[]) => {
    setSchema(newSchema)
  }

  const addSchemaAttribute = useCallback((name: string) => {
    setNewAttributeKey(name)

    // Set default value if available
    const schemaItem = schema.find(item => item.name === name)
    if (schemaItem?.default !== undefined) {
      setNewAttributeValue(String(schemaItem.default))
    } else {
      setNewAttributeValue("")
    }
  }, [schema])

  // Apply schema attributes to selected node
  const applySchemaToSelected = useCallback(() => {
    if (selectedNode) {
      const nodeData = { ...selectedNode.data }
      const updatedData = applySchemaToNodeData(nodeData, schema)

      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id === selectedNode.id) {
            return {
              ...n,
              data: updatedData,
            }
          }
          return n
        })
      )
    } else if (selectedEdge && selectedEdge.data) {
      const edgeData = { ...selectedEdge.data }
      const updatedData = applySchemaToNodeData(edgeData, schema)

      setEdges((edges) =>
        edges.map((e) => {
          if (e.id === selectedEdge.id) {
            return {
              ...e,
              data: updatedData,
            }
          }
          return e
        })
      )
    }
  }, [selectedNode, selectedEdge, schema, setNodes, setEdges])

  if (!selectedNode && !selectedEdge) {
    return (
      <Card className="w-full h-full overflow-auto">
        <CardHeader className="pb-2">
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mx-6">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="properties" className="p-6 pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a node or edge in the diagram to edit its properties. You can:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Edit basic properties like title and description</li>
                  <li>Add custom attributes</li>
                  <li>Configure edge connections and aliases</li>
                  <li>Apply schema attributes for consistency</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="p-6 pt-4 space-y-4">
              <ConnectionSettingsPanel />
              <div className="mt-6"></div>
              <SchemaConfigurationPanel schema={schema} onSchemaChange={handleSchemaChange} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full h-full overflow-auto">
      <CardHeader className="pb-2">
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mx-6">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="p-6 pt-4 space-y-4">

            {selectedNode && (
              <Collapsible
                open={isBasicPropsOpen}
                onOpenChange={setIsBasicPropsOpen}
                className="space-y-4 border rounded-md p-3"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Basic Properties</Label>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {isBasicPropsOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={selectedNode.data.label || ""}
                      onChange={(e) => updateNodeData("label", e.target.value)}
                      placeholder="Enter node title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={selectedNode.data.description || ""}
                      onChange={(e) => updateNodeData("description", e.target.value)}
                      placeholder="Enter node description"
                      className="min-h-[100px]"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            {selectedEdge && (
              <>
                <Collapsible
                  open={isBasicPropsOpen}
                  onOpenChange={setIsBasicPropsOpen}
                  className="space-y-4 border rounded-md p-3"
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Basic Properties</Label>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {isBasicPropsOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronsUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="label">Title</Label>
                      <Input
                        id="label"
                        value={selectedEdge.data?.label || ""}
                        onChange={(e) => updateEdgeData("label", e.target.value)}
                        placeholder="Enter edge label"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={selectedEdge.data?.description || ""}
                        onChange={(e) => updateEdgeData("description", e.target.value)}
                        placeholder="Enter edge description"
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Input
                        id="type"
                        value={selectedEdge.data?.type || ""}
                        onChange={(e) => updateEdgeData("type", e.target.value)}
                        placeholder="Aliae"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible
                  open={isAliasesOpen}
                  onOpenChange={setIsAliasesOpen}
                  className="space-y-4 border rounded-md p-3 mt-4"
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Aliases</Label>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {isAliasesOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronsUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        id="aliases"
                        value={Array.isArray(selectedEdge.data?.aliases)
                          ? selectedEdge.data?.aliases.join(',')
                          : (selectedEdge.data?.aliases ? JSON.parse(selectedEdge.data?.aliases).join(',') : '')}
                        onChange={(e) => {
                          // Convert comma-separated string to array
                          const aliasesText = e.target.value;
                          // Split by comma and trim each value
                          const newAliases = aliasesText ? aliasesText.split(',').map(a => a.trim()) : [];
                          // Store directly as an array, not as a JSON string
                          updateEdgeData("aliases", newAliases);
                        }}
                        placeholder="North,n,no"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Aliases are alternative names for this connection. Enter as a comma-separated list.
                        Example: North,n,no
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible
                  open={isTwoWayOpen}
                  onOpenChange={setIsTwoWayOpen}
                  className="space-y-4 border rounded-md p-3 mt-4"
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Two-Way Exit</Label>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {isTwoWayOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronsUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="twoWay" className="cursor-pointer">Enable two-way exit</Label>
                      <Switch
                        id="twoWay"
                        checked={selectedEdge.data?.twoWay || false}
                        onCheckedChange={(checked) => updateEdgeData("twoWay", checked)}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      When enabled, a return exit will be created automatically with reverse properties.
                    </p>

                    {/* Only show reverse fields when two-way is enabled */}
                    {selectedEdge.data?.twoWay && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="reverseName">Reverse Name</Label>
                          <Input
                            id="reverseName"
                            value={selectedEdge.data?.reverseName || selectedEdge.data?.label || ""}
                            onChange={(e) => updateEdgeData("reverseName", e.target.value)}
                            placeholder="Enter reverse exit name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reverseAliases">Reverse Aliases</Label>
                          <Input
                            id="reverseAliases"
                            value={Array.isArray(selectedEdge.data?.reverseAliases)
                              ? selectedEdge.data?.reverseAliases.join(',')
                              : (selectedEdge.data?.reverseAliases ?
                                (typeof selectedEdge.data?.reverseAliases === 'string'
                                  ? selectedEdge.data?.reverseAliases
                                  : JSON.stringify(selectedEdge.data?.reverseAliases))
                                : '')}
                            onChange={(e) => {
                              // Convert comma-separated string to array
                              const aliasesText = e.target.value;
                              // Split by comma and trim each value
                              const newAliases = aliasesText ? aliasesText.split(',').map(a => a.trim()) : [];
                              // Store directly as an array
                              updateEdgeData("reverseAliases", newAliases);
                            }}
                            placeholder="South,s,so"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reverseDescription">Reverse Description</Label>
                          <Textarea
                            id="reverseDescription"
                            value={selectedEdge.data?.reverseDescription || ""}
                            onChange={(e) => updateEdgeData("reverseDescription", e.target.value)}
                            placeholder="Enter description for the return exit"
                            className="min-h-[80px]"
                          />
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
            {/* Attributes Section */}
            <Collapsible
              open={isAttributesOpen}
              onOpenChange={setIsAttributesOpen}
              className="space-y-4 pt-4 border-t"
            >
              <div className="flex items-center justify-between">
                <Label>Attributes</Label>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isAttributesOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-4">



                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={applySchemaToSelected}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Apply Schema
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs">
                      Apply selected schema to the current data
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="space-y-2">
                  {getAttributes().map((attr) => (
                    <div key={attr.key} className="flex items-center gap-2">
                      <Input
                        value={attr.key}
                        readOnly
                        className="flex-1 bg-muted"
                      />
                      {attr.type === "boolean" ? (
                        <div className="flex flex-1 items-center justify-between">
                          <Switch
                            checked={attr.value === "true"}
                            onCheckedChange={(checked) =>
                              (selectedNode ? updateNodeData : updateEdgeData)(
                                `attr_${attr.key}`,
                                String(checked)
                              )
                            }
                          />
                        </div>
                      ) : attr.type === "choices" && attr.choices ? (
                        <Select
                          value={attr.value}
                          onValueChange={(value) =>
                            (selectedNode ? updateNodeData : updateEdgeData)(
                              `attr_${attr.key}`,
                              value
                            )
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {attr.choices.map((choice) => (
                              <SelectItem key={choice} value={choice}>
                                {choice}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={attr.value}
                          onChange={(e) =>
                            (selectedNode ? updateNodeData : updateEdgeData)(`attr_${attr.key}`, e.target.value)
                          }
                          className="flex-1"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttribute(`attr_${attr.key}`)}
                        className="h-10 w-10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  {schema.length > 0 ? (
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="schemaKey">Add from Schema</Label>
                      <Select
                        value={newAttributeKey}
                        onValueChange={(value) => addSchemaAttribute(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select attribute" />
                        </SelectTrigger>
                        <SelectContent>
                          {getUnusedSchemaItems().map((item) => (
                            <SelectItem key={item.name} value={item.name}>
                              {item.name} ({item.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="attrKey">Key</Label>
                      <Input
                        id="attrKey"
                        value={newAttributeKey}
                        onChange={(e) => setNewAttributeKey(e.target.value)}
                        placeholder="Enter key"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="attrValue">Value</Label>
                    <Input
                      id="attrValue"
                      value={newAttributeValue}
                      onChange={(e) => setNewAttributeValue(e.target.value)}
                      placeholder="Enter value"
                    />
                  </div>
                  <Button
                    onClick={addAttribute}
                    disabled={!newAttributeKey.trim()}
                    className="h-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* If schema is present but want to add custom attributes */}
                {schema.length > 0 && (
                  <div className="flex items-end gap-2 border-t pt-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="customAttrKey">Custom Key</Label>
                      <Input
                        id="customAttrKey"
                        value={newAttributeKey}
                        onChange={(e) => setNewAttributeKey(e.target.value)}
                        placeholder="Enter custom key"
                      />
                    </div>
                    <div className="flex-1 invisible">
                      <Label>Spacer</Label>
                      <div className="h-10"></div>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="settings" className="p-6 pt-4 space-y-4">
            <ConnectionSettingsPanel />
            <div className="mt-6"></div>
            <SchemaConfigurationPanel schema={schema} onSchemaChange={handleSchemaChange} />
          </TabsContent>
        </Tabs>

        <AttributeSchemaModal
          open={schemaModalOpen}
          onOpenChange={setSchemaModalOpen}
          onSave={handleSchemaChange}
          currentSchema={schema}
        />
      </CardContent>
    </Card>
  )
}