"use client"

import { useState } from "react"
import { useReactFlow } from "reactflow"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Storage key for hidden nodes
const HIDDEN_NODES_STORAGE_KEY = "flow-diagram-hidden-nodes"

export function getHiddenNodes() {
  if (typeof window === "undefined") return []
  
  try {
    const savedNodes = localStorage.getItem(HIDDEN_NODES_STORAGE_KEY)
    return savedNodes ? JSON.parse(savedNodes) : []
  } catch (error) {
    console.error("Error loading hidden nodes from storage:", error)
    return []
  }
}

export function saveHiddenNode(node: any) {
  if (typeof window === "undefined") return
  
  try {
    const hiddenNodes = getHiddenNodes()
    hiddenNodes.push(node)
    localStorage.setItem(HIDDEN_NODES_STORAGE_KEY, JSON.stringify(hiddenNodes))
  } catch (error) {
    console.error("Error saving hidden node to storage:", error)
  }
}

export function clearHiddenNodesFromStorage() {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(HIDDEN_NODES_STORAGE_KEY, JSON.stringify([]))
  } catch (error) {
    console.error("Error clearing hidden nodes from storage:", error)
  }
}

export default function ShowHiddenRooms() {
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleShowHiddenRooms = () => {
    setIsLoading(true)
    try {
      const hiddenNodes = getHiddenNodes()
      
      if (hiddenNodes.length === 0) {
        toast({
          title: "No Hidden Rooms",
          description: "There are no hidden rooms to show.",
        })
        setIsLoading(false)
        return
      }
      
      // Add the hidden nodes to the canvas
      setNodes((nodes) => [...nodes, ...hiddenNodes])
      
      // Clear the hidden nodes storage
      clearHiddenNodesFromStorage()
      
      toast({
        title: "Hidden Rooms Shown",
        description: `${hiddenNodes.length} hidden room(s) have been restored to the canvas.`,
      })
    } catch (error) {
      console.error("Error showing hidden rooms:", error)
      toast({
        title: "Error",
        description: "Failed to show hidden rooms.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleShowHiddenRooms} 
      variant="outline" 
      className="flex items-center gap-2"
      disabled={isLoading}
    >
      <Eye className="h-4 w-4" />
      Show Hidden Rooms
    </Button>
  )
} 