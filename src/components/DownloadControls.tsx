import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface DownloadControlsProps {
  formats: string[];
  selectedFormat: string;
  onFormatChange: (format: string) => void;
  onDownload: () => void;
  canDownload: boolean; // Combined flag: (generatedContent && selectedFormat)
  isDownloading: boolean;
  // Other states that might disable download
  isLoading: boolean;
  isRegenerating: boolean;
  isSaving: boolean;
}

export default function DownloadControls({
  formats,
  selectedFormat,
  onFormatChange,
  onDownload,
  canDownload,
  isDownloading,
  isLoading,
  isRegenerating,
  isSaving,
}: DownloadControlsProps) {
  const disableActions = isLoading || isRegenerating || isSaving || isDownloading;

  return (
    <div className="flex flex-col gap-4 pt-4 border-t mt-4">
      {/* Output Format Selection */}
      <div className="grid w-full gap-1.5">
        <Label>Select Download Format</Label>
        <div className="flex flex-wrap gap-2">
          {formats.map(format => (
            <Button
              key={format}
              variant={selectedFormat === format ? "default" : "secondary"}
              onClick={() => onFormatChange(format)}
              className="transition-colors duration-200"
              disabled={disableActions}
            >
              {format}
            </Button>
          ))}
        </div>
      </div>

      {/* Download Button */}
      <Button
        onClick={onDownload}
        disabled={!canDownload || disableActions}
        className="transition-colors duration-200 w-full"
      >
        {isDownloading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading...</>
        ) : `Download ${selectedFormat || '...'}`}
      </Button>
    </div>
  );
}
