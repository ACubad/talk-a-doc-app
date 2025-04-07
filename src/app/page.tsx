"use client"; // Required for hooks like useState

"use client"; // Required for hooks like useState

import React, { useState, useEffect, useRef } from 'react';
import { useTranscription } from '@/hooks/useTranscription';

// Import Shadcn UI components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react"; // Import Loader2 and Plus
import RichTextPreviewEditor from '@/components/RichTextPreviewEditor'; // Import the new editor

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState('en-US'); // Input language
  const [outputLanguage, setOutputLanguage] = useState('en'); // Output language, default English
  const [selectedDocType, setSelectedDocType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading state for generation
  const [isDownloading, setIsDownloading] = useState(false); // Loading state for download
  const [apiError, setApiError] = useState<string | null>(null);

  // Use the transcription hook
  const {
    // isConnected, // Removed
    isRecording,
    transcriptions, // Changed from transcription
    // interimTranscription, // Removed
    error: transcriptionError, // Keep top-level error for now
    isLoading: isTranscribing, // Keep top-level loading for now
    startRecording,
    stopRecording,
    // setTranscription, // Removed setter
    sendAudioToApi, // Get the function to send audio blobs
  } = useTranscription();

  // Combine transcriptions from the array for display and generation
  const combinedTranscription = transcriptions.map(t => t.text).join('\n\n---\n\n'); // Join with separator

  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log(`File selected: ${file.name}, size: ${file.size}, type: ${file.type}`);
      // Basic validation (optional: add more specific types)
      if (!file.type.startsWith('audio/')) {
        setApiError('Invalid file type. Please upload an audio file.');
        // Reset file input value so the same file can be selected again if needed
        if (event.target) event.target.value = '';
        return;
      }
      setApiError(null); // Clear previous errors
      // Use the function from the hook to send the file
      sendAudioToApi(file, selectedLanguage);
      // Reset file input value so the same file can be selected again if needed
      if (event.target) event.target.value = '';
    }
  };


  // Function to call the generate API - Use combined text
  const handleGenerateContent = async (docType: string) => {
    // Check if the combined transcription is empty
    if (!combinedTranscription) {
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
        // Include outputLanguage in the request body
        // Use combinedTranscription in the request body
        body: JSON.stringify({ transcription: combinedTranscription, docType, outputLanguage }),
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

  // Function to handle download button click
  const handleDownload = async () => {
    if (!generatedContent || !selectedFormat) {
      setApiError("No content generated or format selected for download.");
      return;
    }
    setIsDownloading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedContent,
          format: selectedFormat,
          docType: selectedDocType // Pass docType for context if needed (e.g., PPTX)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Download request failed with status ${response.status}`);
      }

      // Trigger browser download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract filename from Content-Disposition header if possible, otherwise use default
      const disposition = response.headers.get('Content-Disposition');
      let filename = `generated_document.${selectedFormat.toLowerCase()}`; // Default filename
      if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Download API error:", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred during download.");
    } finally {
      setIsDownloading(false);
    }
  };


  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'sw-TZ', name: 'Swahili (Tanzania)' },
    { code: 'tr-TR', name: 'Turkish' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'de-DE', name: 'German' },
    // Add more input languages if supported by Google Speech API
  ];

  const outputLanguages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'tr', name: 'Turkish' },
      { code: 'sw', name: 'Swahili' },
      { code: 'de', name: 'German' },
      // Add more output languages supported by Gemini
  ];

  const docTypes = ['Report', 'Email', 'Excel', 'PowerPoint'];
  const formats = ['DOCX', 'PDF', 'CSV', 'PPTX'];

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

            {/* Connection Status - Removed as WebSocket is gone */}
            {/* <div className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
            </div> */}

            {/* Audio Controls */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                variant={isRecording ? "destructive" : "default"}
                className="transition-colors duration-200" // Add transition
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
              {/* File Input (Hidden) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept="audio/*" // Accept all audio types
              />
              {/* Upload Audio Button */}
              <Button
                variant="outline"
                onClick={handleUploadClick}
                disabled={isRecording || isTranscribing}
                className="transition-colors duration-200" // Add transition
              >
                Upload Audio
              </Button>
              {/* Add Audio Button */}
              <Button
                variant="outline"
                size="icon" // Make it a square icon button
                onClick={handleUploadClick} // Re-use upload handler for now
                disabled={isRecording || isTranscribing}
                className="transition-colors duration-200"
                aria-label="Add another audio file" // Accessibility label
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Transcription Area - Displaying Multiple Items */}
            <div className="grid w-full gap-2"> {/* Changed gap */}
              <Label>Transcriptions</Label>
              {/* Map over the transcriptions array */}
              {transcriptions.length === 0 && !isRecording && !isTranscribing && (
                 <p className="text-sm text-muted-foreground">Your transcriptions will appear here...</p>
              )}
              {transcriptions.map((item) => (
                <Card key={item.id} className="bg-muted p-3">
                  {item.isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{item.text || 'Processing...'}</span> {/* Show 'Recording...' or 'Processing...' */}
                    </div>
                  )}
                  {item.error && (
                    <Alert variant="destructive" className="p-2 text-xs">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{item.error}</AlertDescription>
                    </Alert>
                  )}
                  {!item.isLoading && !item.error && (
                    <p className="text-sm whitespace-pre-wrap">{item.text || '(Empty transcription)'}</p>
                    // TODO: Add delete button here later
                  )}
                </Card>
              ))}
              {/* Display top-level recording/transcribing state if needed */}
              {/* {isRecording && transcriptions.length === 0 && <p className="text-sm text-muted-foreground">Recording...</p>} */}
              {/* {isTranscribing && transcriptions.length === 0 && <p className="text-sm text-muted-foreground">Transcribing audio...</p>} */}
            </div>

            {/* Display Transcription/Loading/Errors */}
            {transcriptionError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {transcriptionError}
                </AlertDescription>
              </Alert>
            )}

            {/* --- MOVED GENERATION CONTROLS START --- */}

            {/* Output Language Selection */}
            <div className="grid w-full max-w-sm items-center gap-1.5 pt-4 border-t mt-4"> {/* Added padding/border */}
              <Label htmlFor="output-language-select">Select Output Language</Label>
              <Select value={outputLanguage} onValueChange={setOutputLanguage}>
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
                    onClick={() => handleGenerateContent(type)}
                    // Disable if loading OR if combined transcription is empty
                    disabled={isLoading || !combinedTranscription}
                    className="transition-colors duration-200" // Add transition
                  >
                    {isLoading && selectedDocType === type ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Display API Errors (Moved here) */}
            {apiError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle> {/* Generic Error Title */}
                <AlertDescription>
                  {apiError}
                </AlertDescription>
              </Alert>
            )}

            {/* --- MOVED GENERATION CONTROLS END --- */}

          </CardContent>
        </Card>

        {/* Right Column: Preview */}
        <Card>
           <CardHeader>
             <CardTitle>2. Preview</CardTitle> {/* Changed Title */}
           </CardHeader>
           <CardContent className="flex flex-col gap-4">
             {/* Rich Text Editor Preview */}
             <div className="grid w-full gap-1.5">
               <Label htmlFor="preview-area">Preview (Editable) {isLoading ? '(Generating...)' : ''}</Label>
               <RichTextPreviewEditor
                 value={generatedContent}
                 onChange={setGeneratedContent} // Update state directly from editor
               />
               {/* Placeholder/Loading Text - Handled within the editor component now */}
             </div>

             {/* --- MOVED OUTPUT/DOWNLOAD CONTROLS START --- */}

             {/* Output Format Selection */}
             <div className="grid w-full gap-1.5 pt-4 border-t mt-4"> {/* Added padding/border */}
               <Label>Select Output Format</Label>
               <div className="flex flex-wrap gap-2">
                 {formats.map(format => (
                   <Button
                     key={format}
                     variant={selectedFormat === format ? "default" : "secondary"}
                     onClick={() => setSelectedFormat(format)}
                     className="transition-colors duration-200" // Add transition
                   >
                     {format}
                   </Button>
                 ))}
               </div>
             </div>

             {/* Download Button */}
             <Button
               onClick={handleDownload}
               disabled={!generatedContent || !selectedFormat || isDownloading || isLoading}
               className="transition-colors duration-200 w-full" // Add transition, make full width
             >
               {isDownloading ? (
                 <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading...</>
               ) : `Download ${selectedFormat || '...'}`}
             </Button>

             {/* --- MOVED OUTPUT/DOWNLOAD CONTROLS END --- */}

           </CardContent>
        </Card>
      </main>

      <footer className="text-center text-sm text-muted-foreground mt-auto pt-4 border-t">
        Powered by Next.js, Supabase, Gemini, and Google Cloud Speech.
      </footer>
    </div>
  );
}
