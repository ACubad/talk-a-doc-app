"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose, // Import DialogClose for explicit closing
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "./AppLayout"; // To get the rename function

interface RenameDocumentDialogProps {
  documentId: string | null;
  currentTitle: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RenameDocumentDialog: React.FC<RenameDocumentDialogProps> = ({
  documentId,
  currentTitle,
  isOpen,
  onOpenChange,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const { renameDocument } = useAppContext(); // Get the handler from context

  // Reset input field when the dialog opens with a new document
  useEffect(() => {
    if (isOpen && currentTitle) {
      setNewTitle(currentTitle);
    } else if (!isOpen) {
      // Optionally reset when closing, though opening effect handles initialization
      setNewTitle('');
    }
  }, [isOpen, currentTitle]);

  const handleSave = async () => {
    if (!documentId || !newTitle.trim()) {
      // Basic validation: Don't save if no ID or title is empty/whitespace
      console.warn("Rename cancelled: Invalid ID or title.");
      return;
    }
    try {
      await renameDocument(documentId, newTitle.trim());
      onOpenChange(false); // Close dialog on successful save
    } catch (error) {
      console.error("Failed to rename document:", error);
      // TODO: Show error to the user (e.g., using a toast notification)
      // Dialog remains open on error for user to retry or cancel
    }
  };

  // Prevent form submission if wrapped in a form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {/* Use onSubmit on a form element if preferred, or just rely on button click */}
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>
              Enter a new name for the document: "{currentTitle || 'Untitled'}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                New Name
              </Label>
              <Input
                id="name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="col-span-3"
                required // Basic HTML5 validation
              />
            </div>
          </div>
          <DialogFooter>
            {/* DialogClose automatically handles onOpenChange(false) */}
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            {/* Use type="submit" if using form onSubmit, otherwise type="button" */}
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
