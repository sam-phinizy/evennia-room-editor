"use client"

import { useState, useCallback, useEffect } from "react"
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath, useReactFlow } from "reactflow"
import { Input } from "@/components/ui/input"

export default function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const [isEditing, setIsEditing] = useState(false)
  // Use data.label directly for rendering and only use state for editing
  const [editingLabel, setEditingLabel] = useState("")
  const { setEdges } = useReactFlow()
  // Add state for label position offset
  const [labelOffset, setLabelOffset] = useState({ x: 0, y: 0 })
  // State for two-way toggle
  const [isTwoWay, setIsTwoWay] = useState(data?.twoWay || false)

  // Get the path for a smooth bezier edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // Update local state when edge props change
  useEffect(() => {
    setIsTwoWay(data?.twoWay || false);
  }, [data?.twoWay]);

  const onLabelDoubleClick = () => {
    setEditingLabel(data?.label || "");
    setIsEditing(true);
  }

  const onLabelChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setEditingLabel(evt.target.value);
  }

  const onLabelBlur = () => {
    setIsEditing(false);
    // Update the edge data with the new label
    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: {
              ...edge.data,
              label: editingLabel,
              labelOffset, // Save the label offset in edge data
              // Ensure aliases array exists if not already present
              aliases: edge.data?.aliases || [],
              twoWay: isTwoWay,
              reverseName: edge.data?.reverseName || editingLabel, // Default to same name
              reverseAliases: edge.data?.reverseAliases || edge.data?.aliases || [], // Default to same aliases
              reverseDescription: edge.data?.reverseDescription || "", // Default to empty description
            },
          }
        }
        return edge
      }),
    )
  }

  const onLabelKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === "Enter") {
      setIsEditing(false);
      // Update the edge data with the new label
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id === id) {
            return {
              ...edge,
              data: {
                ...edge.data,
                label: editingLabel,
                labelOffset, // Save the label offset in edge data
                // Ensure aliases array exists if not already present
                aliases: edge.data?.aliases || [],
                twoWay: isTwoWay,
                reverseName: edge.data?.reverseName || editingLabel, // Default to same name
                reverseAliases: edge.data?.reverseAliases || edge.data?.aliases || [], // Default to same aliases
                reverseDescription: edge.data?.reverseDescription || "", // Default to empty description
              },
            }
          }
          return edge
        }),
      )
    }
  }

  // Add drag handlers
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    // This prevents the label from being dragged as an image
    event.preventDefault()
    event.stopPropagation()
  }

  const onDrag = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    setLabelOffset({
      x: labelOffset.x + event.movementX,
      y: labelOffset.y + event.movementY,
    })
  }

  // Toggle two-way status when clicked with modifier key
  const toggleTwoWay = (event: React.MouseEvent) => {
    // Only toggle if Alt/Option key is pressed (to avoid accidental toggles)
    if (event.altKey) {
      event.stopPropagation();
      event.preventDefault();

      const newTwoWayValue = !isTwoWay;
      setIsTwoWay(newTwoWayValue);

      // Update edge data immediately
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id === id) {
            return {
              ...edge,
              data: {
                ...edge.data,
                twoWay: newTwoWayValue,
                reverseName: edge.data?.reverseName || edge.data?.label || "",
                reverseAliases: edge.data?.reverseAliases || edge.data?.aliases || [],
                reverseDescription: edge.data?.reverseDescription || "",
              },
            }
          }
          return edge
        }),
      )
    }
  }

  // Determine edge color based on the label or use a default
  const getEdgeColor = () => {
    if (!data?.label) return "#888"
    // Different colors for different types of relationships
    switch (data.label.toLowerCase()) {
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

  // Update the style with the color and selection effect
  const edgeColor = getEdgeColor()
  const edgeStyle = {
    ...style,
    stroke: edgeColor,
    strokeWidth: selected ? 3 : 2,
    filter: selected ? 'drop-shadow(0 0 8px rgba(253, 224, 71, 0.5))' : undefined,
  }

  // Use saved label offset from edge data if available
  const savedLabelOffset = data?.labelOffset || { x: 0, y: 0 }
  const effectiveLabelOffset = {
    x: savedLabelOffset.x + labelOffset.x,
    y: savedLabelOffset.y + labelOffset.y,
  }

  // Get aliases from edge data or default to empty array
  const aliases = Array.isArray(data?.aliases)
    ? data?.aliases
    : (data?.aliases && typeof data?.aliases === 'string'
      ? (data?.aliases.startsWith('[') ? JSON.parse(data?.aliases) : data?.aliases.split(','))
      : [])

  // Show aliases list as a tooltip if present
  const aliasesTooltip = aliases.length > 0
    ? `Alternative names: ${aliases.join(', ')}`
    : ''

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX + effectiveLabelOffset.x}px,${labelY + effectiveLabelOffset.y
              }px)`,
            pointerEvents: "all",
            backgroundColor: "white",
            padding: "4px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 500,
            border: `${selected ? '2px' : '1px'} solid ${edgeColor}`,
            color: edgeColor,
            cursor: "move",
            boxShadow: selected ? '0 0 8px rgba(253, 224, 71, 0.5)' : undefined,
          }}
          className="nodrag nopan shadow-sm"
          onDoubleClick={onLabelDoubleClick}
          draggable
          onDragStart={onDragStart}
          onDrag={onDrag}
          title={aliasesTooltip}
          onClick={toggleTwoWay}
        >
          {isEditing ? (
            <Input
              value={editingLabel}
              onChange={onLabelChange}
              onBlur={onLabelBlur}
              onKeyDown={onLabelKeyDown}
              className="w-24 h-6 text-xs p-1"
              autoFocus
            />
          ) : (
            <div className="px-1 py-0.5 flex items-center">
              {data?.label || "Double-click to edit"}
              {aliases.length > 0 && (
                <span className="text-xs ml-1 opacity-70">+{aliases.length}</span>
              )}
              {/* Show bidirectional arrow for two-way exits */}
              {(data?.twoWay || isTwoWay) && (
                <span className="ml-1 opacity-80" title="Two-way exit">↔️</span>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

