"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { checkServerConnection } from "@/lib/api-service"

type ServerConnectionContextType = {
  serverUrl: string
  setServerUrl: (url: string) => void
  isConnected: boolean
  checkConnection: () => Promise<boolean>
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

const ServerConnectionContext = createContext<ServerConnectionContextType | undefined>(undefined)

// Storage keys
const SERVER_URL_STORAGE_KEY = "flow-diagram-server-url"
const SERVER_ENABLED_STORAGE_KEY = "flow-diagram-server-enabled"

export function ServerConnectionProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available
  const [serverUrl, setServerUrlState] = useState<string>("")
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [enabled, setEnabledState] = useState<boolean>(false)

  useEffect(() => {
    // Load server URL and enabled state from localStorage on mount
    try {
      const savedUrl = localStorage.getItem(SERVER_URL_STORAGE_KEY)
      const savedEnabled = localStorage.getItem(SERVER_ENABLED_STORAGE_KEY)
      
      if (savedUrl) {
        setServerUrlState(savedUrl)
        // Check connection when component mounts
        checkConnectionStatus(savedUrl)
      }
      
      if (savedEnabled) {
        setEnabledState(savedEnabled === "true")
      }
    } catch (error) {
      console.error("Error loading server settings from storage:", error)
    }
  }, [])

  // Check if the server is reachable
  const checkConnectionStatus = async (url: string): Promise<boolean> => {
    if (!url.trim()) {
      setIsConnected(false)
      return false
    }

    const success = await checkServerConnection(url)
    setIsConnected(success)
    return success
  }

  // Update localStorage when server URL changes
  const setServerUrl = async (newUrl: string) => {
    setServerUrlState(newUrl)
    try {
      localStorage.setItem(SERVER_URL_STORAGE_KEY, newUrl)
      await checkConnectionStatus(newUrl)
    } catch (error) {
      console.error("Error saving server URL to storage:", error)
    }
  }

  // Update localStorage when enabled state changes
  const setEnabled = (newEnabled: boolean) => {
    setEnabledState(newEnabled)
    try {
      localStorage.setItem(SERVER_ENABLED_STORAGE_KEY, String(newEnabled))
    } catch (error) {
      console.error("Error saving server enabled state to storage:", error)
    }
  }

  const checkConnection = () => checkConnectionStatus(serverUrl)

  return (
    <ServerConnectionContext.Provider value={{ 
      serverUrl, 
      setServerUrl, 
      isConnected,
      checkConnection,
      enabled,
      setEnabled
    }}>
      {children}
    </ServerConnectionContext.Provider>
  )
}

export function useServerConnection() {
  const context = useContext(ServerConnectionContext)
  if (context === undefined) {
    throw new Error("useServerConnection must be used within a ServerConnectionProvider")
  }
  return context
} 