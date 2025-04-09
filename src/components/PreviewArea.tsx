import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw } from "lucide-react";
import RichTextPreviewEditor from '@/components/RichTextPreviewEditor'; // Assuming this path is correct
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Import Card components

interface PreviewAreaProps {
  generatedContent: string;
  onContentChange: (newContent: string) => void;
  currentDocumentTitle: string;
  currentDocumentId: string | null; // Needed for display logic
  isLoading: boolean; // Initial generation loading
  isRegenerating: boolean;
  isSaving: boolean;
  selectedDocType: string; // Needed for regenerate tooltip
  canRegenerate: boolean; // Combined flag: (selectedDocType && (transcription || attachments exist))
  onRegenerate: () => void;
}

export default function PreviewArea({
  generatedContent,
  onContentChange,
  currentDocumentTitle,
  currentDocumentId,
  isLoading,
  isRegenerating,
  isSaving,
  selectedDocType,
  canRegenerate,
  onRegenerate,
}: PreviewAreaProps) {
  const statusText = isLoading ? ' (Generating...)' :
                     isRegenerating ? ' (Regenerating...)' :
                     isSaving ? ' (Saving...)' :
                     currentDocumentId ? ` (Saved: ${currentDocumentTitle || 'Untitled'})` : '';

  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>2. Preview</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRegenerate}
                  disabled={!canRegenerate || isRegenerating || isLoading || isSaving}
                  aria-label="Regenerate content"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Regenerate {selectedDocType || 'Document'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Wrap the editor directly within the Label */}
        <Label className="grid w-full gap-1.5">
          <span> {/* Span to hold the label text */}
            Preview (Editable)
            <span className="text-muted-foreground text-xs">{statusText}</span>
          </span>
          {/* Optional Title Input - kept commented out as in original */}
          {/* <Input
             value={currentDocumentTitle}
             onChange={(e) => setCurrentDocumentTitle(e.target.value)} // This would need a prop callback
             placeholder="Document Title..."
             className="mb-2"
             disabled={isSaving || isLoading || isRegenerating}
          /> */}
          <RichTextPreviewEditor
            // Remove id prop as it's no longer needed for label association
            value={generatedContent}
            onChange={onContentChange}
            // readOnly={isLoading || isRegenerating || isSaving} // Add readOnly based on states if needed
          />
        </Label>
      </CardContent>
    </>
  );
}
