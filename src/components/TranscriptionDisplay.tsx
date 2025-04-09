import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";

// Define the structure for a single transcription item
interface TranscriptionItem {
  id: string;
  text: string;
  isLoading?: boolean;
  error?: string | null;
  // originalFilename?: string; // Removed as it's not used in the display logic here
}

interface TranscriptionDisplayProps {
  transcriptions: TranscriptionItem[];
  isRecording: boolean;
  isTranscribing: boolean; // To show placeholder text correctly
  onUpdateText: (id: string, newText: string) => void;
  onRemoveItem: (id: string) => void;
}

export default function TranscriptionDisplay({
  transcriptions,
  isRecording,
  isTranscribing,
  onUpdateText,
  onRemoveItem,
}: TranscriptionDisplayProps) {
  return (
    <div className="grid w-full gap-2">
      <Label>Transcriptions</Label>
      {transcriptions.length === 0 && !isRecording && !isTranscribing && (
         <p className="text-sm text-muted-foreground">Record or upload audio...</p>
      )}
      {transcriptions.map((item) => (
        <Card key={item.id} className="bg-muted p-3">
        {item.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        )}
        {item.error && (
            <Alert variant="destructive" className="p-2 text-xs">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{item.error}</AlertDescription>
            </Alert>
          )}
          {!item.isLoading && !item.error && (
            <div className="relative group">
              <Textarea
                value={item.text}
                onChange={(e) => onUpdateText(item.id, e.target.value)}
                placeholder="(Empty transcription)"
                className="text-sm bg-background border-0 focus-visible:ring-1 focus-visible:ring-ring pr-8"
                rows={Math.max(3, item.text.split('\n').length)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemoveItem(item.id)}
                aria-label="Remove transcription"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
