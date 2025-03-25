"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export interface AttributeSchemaItem {
  name: string
  type: "string" | "int" | "float" | "boolean" | "choices"
  default?: string | number | boolean
  choices?: string[] // Array of options for the "choices" type
}

interface AttributeSchemaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (schema: AttributeSchemaItem[]) => void
  currentSchema: AttributeSchemaItem[]
}

export default function AttributeSchemaModal({
  open,
  onOpenChange,
  onSave,
  currentSchema,
}: AttributeSchemaModalProps) {
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify(currentSchema, null, 2) || "[]"
  )
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    try {
      // Parse the JSON input
      const parsed = JSON.parse(jsonInput)

      // Validate that it's an array
      if (!Array.isArray(parsed)) {
        setError("Input must be an array of attribute definitions")
        return
      }

      // Validate each item in the array
      for (const item of parsed) {
        if (typeof item !== "object" || item === null) {
          setError("Each item must be an object")
          return
        }

        if (!item.name || typeof item.name !== "string") {
          setError("Each item must have a 'name' property as string")
          return
        }

        if (!item.type || typeof item.type !== "string") {
          setError("Each item must have a 'type' property as string")
          return
        }

        if (!["string", "int", "float", "boolean", "choices"].includes(item.type)) {
          setError("Type must be one of: string, int, float, boolean, choices")
          return
        }

        // If type is choices, validate that choices array is present and valid
        if (item.type === "choices") {
          if (!Array.isArray(item.choices) || item.choices.length === 0) {
            setError(`Attribute ${item.name} with type 'choices' must have a non-empty 'choices' array`)
            return
          }

          // Check all choices are strings
          if (!item.choices.every(choice => typeof choice === "string")) {
            setError(`All choices for ${item.name} must be strings`)
            return
          }

          // Check if default value is within choices
          if (item.default !== undefined && !item.choices.includes(String(item.default))) {
            setError(`Default value for ${item.name} must be one of the choices`)
            return
          }
        }

        // Validate default value if present
        if ("default" in item) {
          if (item.type === "string" && typeof item.default !== "string") {
            setError(`Default value for ${item.name} must be a string`)
            return
          }
          if (item.type === "int" && (!Number.isInteger(Number(item.default)))) {
            setError(`Default value for ${item.name} must be an integer`)
            return
          }
          if (item.type === "float" && (isNaN(Number(item.default)))) {
            setError(`Default value for ${item.name} must be a number`)
            return
          }
          if (item.type === "boolean" && typeof item.default !== "boolean") {
            setError(`Default value for ${item.name} must be a boolean`)
            return
          }
        }
      }

      // If all validation passes
      setError(null)
      onSave(parsed)
      onOpenChange(false)
    } catch (err) {
      setError("Invalid JSON format")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Attribute Schema Settings</DialogTitle>
          <DialogDescription>
            Paste a JSON schema for attributes. Each attribute should have a name, type, and optional default value.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`[
  {
    "name": "exampleText",
    "type": "string",
    "default": "Example value"
  },
  {
    "name": "exampleNumber",
    "type": "int"
  },
  {
    "name": "exampleChoices",
    "type": "choices",
    "choices": ["option1", "option2", "option3"],
    "default": "option1"
  }
]`}
            className="min-h-[250px] font-mono text-sm"
          />

          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Schema</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}