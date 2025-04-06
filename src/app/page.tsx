"use client"; // Required for hooks like useState

"use client"; // Required for hooks like useState

import React, { useState, useEffect } from 'react';
import { useTranscription } from '@/hooks/useTranscription'; // Import the hook

// Import Shadcn UI components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge"; // Not used yet
// TODO: Add Loader2 for loading state later: import { Loader2 } from "lucide-react";

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState('en-US'); // Default to US English
  const [selectedDocType, setSelectedDocType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const [apiError, setApiError] = useState<string | null>(null); // Add API error state

  // Use the transcription hook
  const {
    isConnected,
    isRecording,
    transcription,
    interimTranscription,
    error: transcriptionError,
    startRecording,
    stopRecording,
    setTranscription, // Get the setter for manual edits
  } = useTranscription();

  // Function to call the generate API
  const handleGenerateContent = async (docType: string) => {
    if (!transcription) {
      setApiError("Please provide transcription text first.");
      return;
    }
    setIsLoading(true);
    setApiError(null);
    setGeneratedContent(''); // Clear previous content
    setSelectedDocType(docType); // Set the selected type

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcription, docType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setGeneratedContent(data.generatedContent);

    } catch (error) {
      console.error("Generation API error:", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred during generation.");
    } finally {
      setIsLoading(false);
    }
  };


  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'sw-TZ', name: 'Swahili (Tanzania)' },
    { code: 'tr-TR', name: 'Turkish' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'de-DE', name: 'German' },
  ];

  const docTypes = ['Report', 'Email', 'Excel', 'PowerPoint'];
  const formats = ['DOCX', 'PDF', 'CSV', 'PPTX']; // PPTM handled via VBA in PPTX

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold">Talk A Doc</h1>
        <p className="text-muted-foreground">Generate documents from your voice.</p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
        {/* Left Column: Input & Transcription */}
        <Card>
          <CardHeader>
            <CardTitle>1. Input & Transcribe</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Language Selection */}
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="language-select">Select Language</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
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

            {/* Connection Status */}
            <div className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            {/* Audio Controls */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording(selectedLanguage); // Pass selected language
                  }
                }}
                disabled={!isConnected} // Disable if not connected
                variant={isRecording ? "destructive" : "default"}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
              {/* TODO: Implement Upload Audio functionality */}
              <Button variant="outline" disabled>Upload Audio</Button>
            </div>

            {/* Transcription Area */}
            <div className="grid w-full gap-1.5">
              <Label htmlFor="transcription-area">Transcription (Editable)</Label>
              {/* Display combined final and interim transcription */}
              <Textarea
                id="transcription-area"
                rows={10}
                value={transcription + interimTranscription} // Show final + interim
                onChange={(e) => setTranscription(e.target.value)} // Allow manual edits to the final part
                placeholder="Your transcription will appear here..."
                className="bg-muted"
              />
              {interimTranscription && <p className="text-sm text-muted-foreground italic">Listening...</p>}
            </div>

            {/* Display Errors */}
            {transcriptionError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {transcriptionError}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Generation & Download */}
        <Card>
           <CardHeader>
             <CardTitle>2. Generate & Download</CardTitle>
           </CardHeader>
           <CardContent className="flex flex-col gap-4">
            {/* Document Type Selection */}
            <div className="grid w-full gap-1.5">
              <Label>Select Document Type</Label>
              <div className="flex flex-wrap gap-2">
                {docTypes.map(type => (
                  <Button
                    key={type}
                    variant={selectedDocType === type ? "default" : "secondary"}
                    onClick={() => handleGenerateContent(type)} // Call API on click
                    disabled={isLoading || !transcription} // Disable while loading or if no transcription
                  >
                    {/* TODO: Add loading indicator */}
                    {isLoading && selectedDocType === type ? 'Generating...' : type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Generated Content Preview */}
            <div className="grid w-full gap-1.5">
              <Label htmlFor="preview-area">Preview {isLoading ? '(Generating...)' : ''}</Label>
              {/* TODO: Replace with Shadcn ScrollArea or similar */}
              <div id="preview-area" className={`w-full p-3 border rounded h-40 bg-muted overflow-auto text-sm ${isLoading ? 'opacity-50' : ''}`}>
                {generatedContent || <span className="text-muted-foreground">Select a document type above to generate content...</span>}
              </div>
            </div>

             {/* Display API Errors */}
             {apiError && (
               <Alert variant="destructive">
                 <AlertTitle>Generation Error</AlertTitle>
                 <AlertDescription>
                   {apiError}
                 </AlertDescription>
               </Alert>
             )}

            {/* Output Format Selection */}
            {/* TODO: Add API call to generate content on doc type selection */}
            <div className="grid w-full gap-1.5">
              <Label>Select Output Format</Label>
              <div className="flex flex-wrap gap-2">
                {formats.map(format => (
                  <Button
                    key={format}
                    variant={selectedFormat === format ? "default" : "secondary"}
                    onClick={() => setSelectedFormat(format)}
                  >
                    {format}
                  </Button>
                ))}
              </div>
            </div>

            {/* Download Button */}
            {/* TODO: Add download logic */}
            <Button
              disabled={!generatedContent || !selectedFormat}
            >
              Download {selectedFormat || '...'}
            </Button>
          </CardContent>
        </Card>
      </main>

      <footer className="text-center text-sm text-muted-foreground mt-auto pt-4 border-t">
        Powered by Next.js, Supabase, Gemini, and Google Cloud Speech.
      </footer>
    </div>
  );
}
