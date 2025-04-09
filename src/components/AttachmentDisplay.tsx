import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface AttachmentDisplayProps {
  attachments: File[];
  onRemoveAttachment: (index: number) => void;
}

export default function AttachmentDisplay({
  attachments,
  onRemoveAttachment,
}: AttachmentDisplayProps) {
  return (
    <div className="grid w-full gap-2 pt-4 border-t mt-4">
      <Label>Attachments</Label>
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files attached yet.</p>
      ) : (
        <ul className="list-none space-y-1">
          {attachments.map((file, index) => (
            <li key={index} className="text-sm flex justify-between items-center bg-muted p-2 rounded">
              <span className="truncate pr-2">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive h-6 w-6"
                onClick={() => onRemoveAttachment(index)}
                aria-label="Remove attachment"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
