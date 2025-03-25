"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X, Pencil, Check } from "lucide-react"
import { AttributeSchemaItem } from "./attribute-schema-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface SchemaEditorProps {
  schema: AttributeSchemaItem[]
  onSchemaChange: (newSchema: AttributeSchemaItem[]) => void
}

interface EditingSchemaItem {
  name: string;
  type: AttributeSchemaItem["type"];
  default?: string;
  choices?: string;
}

export default function SchemaEditor({ schema, onSchemaChange }: SchemaEditorProps) {
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<AttributeSchemaItem["type"]>("string")
  const [newDefault, setNewDefault] = useState("")
  const [newChoices, setNewChoices] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editItem, setEditItem] = useState<EditingSchemaItem | null>(null)

  const addSchemaItem = () => {
    if (!newName.trim()) return

    const newItem: AttributeSchemaItem = {
      name: newName.trim(),
      type: newType,
    }

    // Add default value if provided
    if (newDefault.trim()) {
      switch (newType) {
        case "string":
          newItem.default = newDefault
          break
        case "int":
          newItem.default = parseInt(newDefault)
          break
        case "float":
          newItem.default = parseFloat(newDefault)
          break
        case "boolean":
          newItem.default = newDefault.toLowerCase() === "true"
          break
        case "choices":
          newItem.default = newDefault
          break
      }
    }

    // Add choices if type is choices
    if (newType === "choices" && newChoices.trim()) {
      newItem.choices = newChoices.split(",").map(choice => choice.trim())
    }

    onSchemaChange([...schema, newItem])
    
    // Reset form
    setNewName("")
    setNewType("string")
    setNewDefault("")
    setNewChoices("")
  }

  const startEditing = (index: number) => {
    const item = schema[index]
    setEditingIndex(index)
    setEditItem({
      name: item.name,
      type: item.type,
      default: item.default !== undefined ? String(item.default) : "",
      choices: item.choices ? item.choices.join(", ") : ""
    })
  }

  const saveEdit = () => {
    if (!editItem || editingIndex === null) return

    const updatedItem: AttributeSchemaItem = {
      name: editItem.name.trim(),
      type: editItem.type,
    }

    // Add default value if provided
    if (editItem.default?.trim()) {
      switch (editItem.type) {
        case "string":
          updatedItem.default = editItem.default
          break
        case "int":
          updatedItem.default = parseInt(editItem.default)
          break
        case "float":
          updatedItem.default = parseFloat(editItem.default)
          break
        case "boolean":
          updatedItem.default = editItem.default.toLowerCase() === "true"
          break
        case "choices":
          updatedItem.default = editItem.default
          break
      }
    }

    // Add choices if type is choices
    if (editItem.type === "choices" && editItem.choices?.trim()) {
      updatedItem.choices = editItem.choices.split(",").map(choice => choice.trim())
    }

    const newSchema = [...schema]
    newSchema[editingIndex] = updatedItem
    onSchemaChange(newSchema)
    
    // Reset edit state
    setEditingIndex(null)
    setEditItem(null)
  }

  const removeSchemaItem = (index: number) => {
    const newSchema = [...schema]
    newSchema.splice(index, 1)
    onSchemaChange(newSchema)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {schema.map((item, index) => (
          <div key={index} className="flex items-start gap-2 p-2 border rounded-md">
            {editingIndex === index ? (
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editItem?.name || ""}
                      onChange={(e) => setEditItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={editItem?.type || "string"}
                      onValueChange={(value: AttributeSchemaItem["type"]) => 
                        setEditItem(prev => prev ? { ...prev, type: value } : null)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="int">Integer</SelectItem>
                        <SelectItem value="float">Float</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="choices">Choices</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Value</Label>
                  <Input
                    value={editItem?.default || ""}
                    onChange={(e) => setEditItem(prev => prev ? { ...prev, default: e.target.value } : null)}
                  />
                </div>
                {editItem?.type === "choices" && (
                  <div className="space-y-2">
                    <Label>Choices (comma-separated)</Label>
                    <Textarea
                      value={editItem?.choices || ""}
                      onChange={(e) => setEditItem(prev => prev ? { ...prev, choices: e.target.value } : null)}
                      placeholder="option1, option2, option3"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">
                  Type: {item.type}
                  {item.default !== undefined && ` • Default: ${item.default}`}
                  {item.choices && ` • Choices: ${item.choices.join(", ")}`}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {editingIndex === index ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={saveEdit}
                >
                  <Check className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEditing(index)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSchemaItem(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="attribute_name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={newType} onValueChange={(value: AttributeSchemaItem["type"]) => setNewType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="int">Integer</SelectItem>
                <SelectItem value="float">Float</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="choices">Choices</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default">Default Value</Label>
          <Input
            id="default"
            value={newDefault}
            onChange={(e) => setNewDefault(e.target.value)}
            placeholder="Default value"
          />
        </div>

        {newType === "choices" && (
          <div className="space-y-2">
            <Label htmlFor="choices">Choices (comma-separated)</Label>
            <Textarea
              id="choices"
              value={newChoices}
              onChange={(e) => setNewChoices(e.target.value)}
              placeholder="option1, option2, option3"
            />
          </div>
        )}

        <Button
          onClick={addSchemaItem}
          disabled={!newName.trim()}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Schema Item
        </Button>
      </div>
    </div>
  )
} 