"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { AttributeSchemaItem } from "@/components/attribute-schema-modal"

type AttributeSchemaContextType = {
  schema: AttributeSchemaItem[]
  setSchema: (schema: AttributeSchemaItem[]) => void
}

const AttributeSchemaContext = createContext<AttributeSchemaContextType | undefined>(undefined)

// Storage key for schema
const SCHEMA_STORAGE_KEY = "flow-diagram-attribute-schema"

export function AttributeSchemaProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available
  const [schema, setSchemaState] = useState<AttributeSchemaItem[]>([])

  useEffect(() => {
    // Load schema from localStorage on mount
    try {
      const saved = localStorage.getItem(SCHEMA_STORAGE_KEY)
      if (saved) {
        setSchemaState(JSON.parse(saved))
      }
    } catch (error) {
      console.error("Error loading attribute schema from storage:", error)
    }
  }, [])

  // Update localStorage when schema changes
  const setSchema = (newSchema: AttributeSchemaItem[]) => {
    setSchemaState(newSchema)
    try {
      localStorage.setItem(SCHEMA_STORAGE_KEY, JSON.stringify(newSchema))
    } catch (error) {
      console.error("Error saving attribute schema to storage:", error)
    }
  }

  return (
    <AttributeSchemaContext.Provider value={{ schema, setSchema }}>
      {children}
    </AttributeSchemaContext.Provider>
  )
}

export function useAttributeSchema() {
  const context = useContext(AttributeSchemaContext)
  if (context === undefined) {
    throw new Error("useAttributeSchema must be used within an AttributeSchemaProvider")
  }
  return context
}

// Helper function to convert a value to the correct type based on schema
export function convertValueByType(value: string, type: string): string | number | boolean {
  if (type === "int") {
    return parseInt(value, 10)
  } else if (type === "float") {
    return parseFloat(value)
  } else if (type === "boolean") {
    return value.toLowerCase() === "true"
  } else if (type === "choices") {
    // For choices type, we store the selected choice as a string
    return value
  }
  return value
}

// Helper function to get default value for an attribute
export function getDefaultValue(attrName: string, schema: AttributeSchemaItem[]): string | number | boolean | undefined {
  const schemaItem = schema.find(item => item.name === attrName)
  return schemaItem?.default
}

// Get type for an attribute
export function getAttributeType(attrName: string, schema: AttributeSchemaItem[]): string {
  const schemaItem = schema.find(item => item.name === attrName)
  return schemaItem?.type || "string"
}

// Get choices for an attribute
export function getAttributeChoices(attrName: string, schema: AttributeSchemaItem[]): string[] | undefined {
  const schemaItem = schema.find(item => item.name === attrName)
  return schemaItem?.choices
}