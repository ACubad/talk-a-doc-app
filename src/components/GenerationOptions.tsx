import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Language {
  code: string;
  name: string;
}

interface GenerationOptionsProps {
  outputLanguages: Language[];
  selectedOutputLanguage: string;
  onOutputLanguageChange: (value: string) => void;
  docTypes: string[];
  selectedDocType: string;
  onGenerateContent: (docType: string) => void;
  isLoading: boolean; // Loading state for the *initial* generation of a specific type
  isRegenerating: boolean; // Loading state for the regenerate button (handled in PreviewArea)
  canGenerate: boolean; // Combined flag: (transcription || attachments exist)
}

export default function GenerationOptions({
  outputLanguages,
  selectedOutputLanguage,
  onOutputLanguageChange,
  docTypes,
  selectedDocType,
  onGenerateContent,
  isLoading,
  isRegenerating,
  canGenerate,
}: GenerationOptionsProps) {
  return (
    <div className="flex flex-col gap-4 pt-4 border-t mt-4">
      {/* Output Language Selection */}
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="output-language-select">Output Language</Label>
        <Select value={selectedOutputLanguage} onValueChange={onOutputLanguageChange}>
          <SelectTrigger id="output-language-select" className="w-full">
            <SelectValue placeholder="Select language..." />
          </SelectTrigger>
          <SelectContent>
            {outputLanguages.map(lang => (
              <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document Type Selection */}
      <div className="grid w-full gap-1.5">
        <Label>Select Document Type</Label>
        <div className="flex flex-wrap gap-2">
          {docTypes.map(type => (
            <Button
              key={type}
              variant={selectedDocType === type ? "default" : "secondary"}
              onClick={() => onGenerateContent(type)}
              // Disable if any generation is happening OR if there's no input
              disabled={isLoading || isRegenerating || !canGenerate}
              className="transition-colors duration-200"
            >
              {/* Show loader only if *this* type is being initially generated */}
              {isLoading && selectedDocType === type ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : type}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
