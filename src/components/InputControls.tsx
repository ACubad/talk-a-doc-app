import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Paperclip } from "lucide-react";

interface Language {
  code: string;
  name: string;
}

interface InputControlsProps {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (value: string) => void;
  isRecording: boolean;
  isTranscribing: boolean;
  onRecordToggle: () => void;
  onUploadClick: () => void;
}

export default function InputControls({
  languages,
  selectedLanguage,
  onLanguageChange,
  isRecording,
  isTranscribing,
  onRecordToggle,
  onUploadClick,
}: InputControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Language Selection */}
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="language-select">Input Language</Label>
        <Select value={selectedLanguage} onValueChange={onLanguageChange}>
          <SelectTrigger id="language-select" className="w-full">
            <SelectValue placeholder="Select language..." />
          </SelectTrigger>
          <SelectContent>
            {languages.map(lang => (
              <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Audio Controls */}
      <div className="flex gap-2">
        <Button
          onClick={onRecordToggle}
          variant={isRecording ? "destructive" : "default"}
          className="transition-colors duration-200"
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onUploadClick}
                disabled={isRecording || isTranscribing}
                className="transition-colors duration-200"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach Audio, Image, PDF, DOCX, TXT</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
