"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useServerConnection } from "@/hooks/use-server-connection"
import { useAttributeSchema } from "@/hooks/use-attribute-schema"
import { AttributeSchemaItem } from "@/components/attribute-schema-modal"
import SchemaEditor from "./schema-editor"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("connection")
  const { serverUrl, setServerUrl, isConnected, checkConnection, enabled, setEnabled } = useServerConnection()
  const { schema, setSchema } = useAttributeSchema()
  const { toast } = useToast()

  const handleSchemaChange = (newSchema: AttributeSchemaItem[]) => {
    setSchema(newSchema)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure application settings and manage your diagram schema.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connection" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="modal-server-url">Evennia Server URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="modal-server-url"
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
                  >
                    Test Connection
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1 text-sm">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="modal-enable-api" className="text-sm">Enable API</Label>
                    <Switch 
                      id="modal-enable-api" 
                      checked={enabled} 
                      onCheckedChange={setEnabled} 
                      disabled={!isConnected} 
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {isConnected && enabled 
                    ? "Changes will be synced with your Evennia server" 
                    : "Working in offline mode. Changes will only be saved locally."}
                </p>
              </div>

              <div className="border-t pt-4 mt-6">
                <h3 className="text-sm font-medium mb-2">About Connection</h3>
                <p className="text-sm text-muted-foreground">
                  When connected to an Evennia server, rooms and exits will be synchronized with your MUD.
                  If disconnected or API is disabled, you can still work on your map locally.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schema" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Attribute Schema</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Define a schema of attributes that can be applied to nodes and edges.
                  This helps maintain consistency across your diagram.
                </p>
                <SchemaEditor schema={schema} onSchemaChange={handleSchemaChange} />
              </div>

              <div className="border-t pt-4 mt-6">
                <h3 className="text-sm font-medium mb-2">About Schema</h3>
                <p className="text-sm text-muted-foreground">
                  The schema defines the structure of attributes for your rooms and exits.
                  You can specify types, defaults, and options to ensure consistency throughout your map.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 