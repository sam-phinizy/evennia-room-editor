"use client"

import { useState } from "react"
import { Handle, Position, type NodeProps, useReactFlow } from "reactflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, Copy, EyeOff } from "lucide-react"
import { Button } from "./ui/button"
import { useToast } from "@/components/ui/use-toast"
import DeleteConfirmationDialog from "./delete-confirmation-dialog"
import { roomApi } from "@/lib/api-service"
import { saveHiddenNode } from "./show-hidden-rooms"

export default function CustomNode({ id, data, isConnectable, selected }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(data.label || "")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { setNodes, setEdges, getNodes } = useReactFlow()
  const { toast } = useToast()

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleHide = () => {
    // Get the node before removing it
    const node = getNodes().find((node) => node.id === id);
    
    if (node) {
      // Save the node to storage before removing it
      saveHiddenNode(node);
    }
    
    // Only hide the node from the canvas, don't delete from DB
    setNodes((nodes) => nodes.filter((node) => node.id !== id))
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id))
    
    // Show a toast notification
    toast({
      title: "Room Hidden",
      description: `"${data.label}" has been hidden from the canvas. The room still exists in the database.`,
    })
  }

  const handleConfirmDelete = async () => {
    try {
      // If the node has an API ID, delete it from the database first
      if (data.api_id) {
        await roomApi.deleteRoom(data.api_id);
        toast({
          title: "Room Deleted",
          description: `"${data.label}" has been permanently deleted from the database.`,
        });
      }
      
      // Then remove from the canvas
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    } catch (error) {
      console.error("Error deleting room from API:", error);
      toast({
        title: "API Error",
        description: "Failed to delete room from database, but removed from canvas.",
        variant: "destructive",
      });
      
      // Still remove from canvas even if API call fails
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    }
  }

  const handleDuplicate = () => {
    const nodes = getNodes()
    const originalNode = nodes.find((node) => node.id === id)
    if (!originalNode) return

    // Create a new node with a unique ID
    const newNodeId = `${id}-copy-${Date.now()}`
    const newNode = {
      ...originalNode,
      id: newNodeId,
      position: {
        x: originalNode.position.x + 20,
        y: originalNode.position.y + 20,
      },
      data: {
        ...originalNode.data,
        label: `${originalNode.data.label} (Copy)`,
      },
    }

    setNodes((nodes) => [...nodes, newNode])
  }

  const onLabelDoubleClick = () => {
    setIsEditing(true)
  }

  const onLabelChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(evt.target.value)
  }

  const onLabelBlur = () => {
    setIsEditing(false)
    // Update the node data with the new label
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              label,
            },
          }
        }
        return node
      }),
    )
  }

  const onLabelKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === "Enter") {
      setIsEditing(false)
      // Update the node data with the new label
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                label,
              },
            }
          }
          return node
        }),
      )
    }
  }

  return (
    <>
      <Card className={`w-[200px] shadow-md relative ${selected ? 'ring-4 ring-yellow-200/50 shadow-yellow-100/50' : ''}`}>
        <div className="absolute -top-2 -right-2 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-background hover:bg-primary hover:text-primary-foreground"
            onClick={handleDuplicate}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-background hover:bg-accent hover:text-accent-foreground"
            onClick={handleHide}
            title="Remove from canvas (keeps in database)"
          >
            <EyeOff className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-background hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDeleteClick}
            title="Delete completely"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CardHeader className="p-3" onDoubleClick={onLabelDoubleClick}>
          <CardTitle className="text-sm font-medium">
            {isEditing ? (
              <Input
                value={label}
                onChange={onLabelChange}
                onBlur={onLabelBlur}
                onKeyDown={onLabelKeyDown}
                className="h-6 text-sm p-1"
                autoFocus
              />
            ) : (
              data.label || "Double-click to edit"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
        </CardContent>

        {/* Top handles */}
        <Handle
          type="target"
          position={Position.Top}
          id="top-target"
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary -top-1.5 left-1/4"
        />
        <Handle
          type="source"
          position={Position.Top}
          id="top-source"
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary -top-1.5 right-1/4"
        />

        {/* Right handles */}
        <Handle
          type="target"
          position={Position.Right}
          id="right-target"
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary right-0 top-1/4 -translate-y-1/2 translate-x-1/2"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right-source"
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary right-0 bottom-1/4 translate-y-1/2 translate-x-1/2"
        />

        {/* Bottom handles */}
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom-target"
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary -bottom-1.5 left-1/4"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-source"
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary -bottom-1.5 right-1/4"
        />

        {/* Left handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="left-target"
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary left-0 top-1/4 -translate-y-1/2 -translate-x-1/2"
        />
        <Handle
          type="source"
          position={Position.Left}
          id="left-source"
          isConnectable={isConnectable}
          className="w-3 h-3 bg-primary left-0 bottom-1/4 translate-y-1/2 -translate-x-1/2"
        />
      </Card>
      
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={data.label || ""}
        itemType="room"
        existsInDatabase={!!data.api_id}
      />
    </>
  )
}

