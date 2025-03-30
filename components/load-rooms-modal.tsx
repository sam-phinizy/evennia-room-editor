"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, ChevronsUpDown } from "lucide-react"
import { roomApi, RoomNamesEntry } from "@/lib/api-service"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface LoadRoomsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadRooms: (roomId: number, depth: number) => void;
}

export default function LoadRoomsModal({
  open,
  onOpenChange,
  onLoadRooms,
}: LoadRoomsModalProps) {
  const [roomOptions, setRoomOptions] = useState<RoomNamesEntry[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [depth, setDepth] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch room options when modal opens
  useEffect(() => {
    if (open) {
      const fetchRooms = async () => {
        setIsLoading(true);
        try {
          const rooms = await roomApi.getRoomNames();
          setRoomOptions(rooms);
        } catch (error) {
          console.error("Error fetching rooms:", error);
          toast({
            title: "Error fetching rooms",
            description: "Could not load room options from the server.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchRooms();
    }
  }, [open, toast]);

  const handleLoadRooms = useCallback(() => {
    if (!selectedRoomId) {
      toast({
        title: "Error",
        description: "Please select a room",
        variant: "destructive",
      });
      return;
    }

    if (depth < 1 || depth > 3) {
      toast({
        title: "Error",
        description: "Depth must be between 1 and 3",
        variant: "destructive",
      });
      return;
    }

    onLoadRooms(selectedRoomId, depth);
    onOpenChange(false);
  }, [selectedRoomId, depth, onLoadRooms, onOpenChange, toast]);

  const handleRoomSelect = useCallback((room: RoomNamesEntry) => {
    setSelectedRoomId(room.id);
    setInputValue(room.name);
    setIsOpen(false);
  }, []);

  const selectedRoom = roomOptions.find(room => room.id === selectedRoomId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Load Rooms</DialogTitle>
          <DialogDescription>
            Select a starting room and set the depth to load the room graph.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isOpen}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  {selectedRoom ? selectedRoom.name : isLoading ? "Loading rooms..." : "Select a room..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search rooms..." 
                    value={inputValue}
                    onValueChange={setInputValue}
                  />
                  <CommandEmpty>No rooms found.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-[200px]">
                      {roomOptions.map((room) => (
                        <CommandItem
                          key={room.id}
                          value={room.name}
                          onSelect={() => handleRoomSelect(room)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedRoomId === room.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {room.name} (ID: {room.id})
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="depth">Depth (1-3)</Label>
            <Input
              id="depth"
              type="number"
              min={1}
              max={3}
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLoadRooms}>Load Rooms</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 