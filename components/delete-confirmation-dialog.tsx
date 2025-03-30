"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  itemName: string
  itemType: string // e.g., "room", "exit", etc.
  existsInDatabase?: boolean
}

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType,
  existsInDatabase = false,
}: DeleteConfirmationDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [isMatch, setIsMatch] = useState(false)

  // Reset confirmation text when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmText("")
      setIsMatch(false)
    }
  }, [open])

  // Check if confirmation text matches item name
  useEffect(() => {
    setIsMatch(confirmText.trim().toLowerCase() === itemName.trim().toLowerCase())
  }, [confirmText, itemName])

  const handleConfirm = () => {
    if (isMatch) {
      onConfirm()
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will {existsInDatabase ? 'permanently delete' : 'remove'} the {itemType} <strong>"{itemName}"</strong> 
            {existsInDatabase ? ' from the database' : ' from the canvas'}.
            {existsInDatabase ? (
              <p className="mt-2 text-destructive font-semibold">This action cannot be undone!</p>
            ) : (
              <p className="mt-2">The {itemType} will still exist in the database and can be added back later.</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <Label htmlFor="confirm-text">
            Type <span className="font-semibold">"{itemName}"</span> to confirm:
          </Label>
          <Input
            id="confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-2"
            placeholder={`Type "${itemName}" to confirm`}
            autoFocus
          />
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isMatch}
            className={existsInDatabase ? 
              "bg-destructive text-destructive-foreground hover:bg-destructive/90" : 
              "bg-accent text-accent-foreground hover:bg-accent/90"
            }
          >
            {existsInDatabase ? 'Delete' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 