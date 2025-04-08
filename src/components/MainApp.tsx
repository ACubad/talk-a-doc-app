"use client"; // This is now a Client Component

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
import { Loader2, Plus, Paperclip, X } from "lucide-react"; // Import Loader2, Plus, Paperclip, and X
import RichTextPreviewEditor from '@/components/RichTextPreviewEditor'; // Import the new editor

// Note: The component name is changed from Home to MainApp
export default function MainApp() {
  const [selectedLanguage, setSelectedLanguage] = useState('en-US'); // Input language
  const [outputLanguage, setOutputLanguage] = useState('en'); // Output language, default English
  const [selectedDocType, setSelectedDocType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading state for generation
  const [isDownloading, setIsDownloading] = useState(false); // Loading state for download
  const [apiError, setApiError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]); // State for attached files

  // Use the transcription hook
  const {
    isRecording,
    transcriptions,
    error: transcriptionError,
    isLoading: isTranscribing,
    startRecording,
    stopRecording,
    updateTranscriptionText,
    removeTranscriptionItem,
    sendAudioToApi,
  } = useTranscription();

  // Combine transcriptions from the array for display and generation
  const combinedTranscription = transcriptions.map(t => t.text).join('\n\n---\n\n'); // Join with separator

  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Function to handle file selection - Updated for attachments
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log(`File selected: ${file.name}, size: ${file.size}, type: ${file.type}`);
      setApiError(null); // Clear previous errors

      if (file.type.startsWith('audio/')) {
        sendAudioToApi(file, selectedLanguage);
      } else if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'text/plain') {
        setAttachments(prev => [...prev, file]);
        console.log('Attachment added:', file.name);
      } else {
        setApiError(`Unsupported file type: ${file.type}. Please upload audio, image, PDF, DOC, or TXT files.`);
      }

      if (event.target) event.target.value = '';
    }
  };


  // Function to call the generate API - Use combined text
  const handleGenerateContent = async (docType: string) => {
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
        body: JSON.stringify({
          transcription: combinedTranscription,
          docType,
          outputLanguage,
          attachments: attachments.map(file => ({ name: file.name, type: file.type })),
        }),
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
          docType: selectedDocType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Download request failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers.get('Content-Disposition');
      let filename = `generated_document.${selectedFormat.toLowerCase()}`;
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
  ];

  const outputLanguages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'tr', name: 'Turkish' },
      { code: 'sw', name: 'Swahili' },
      { code: 'de', name: 'German' },
  ];

  const docTypes = ['Report', 'Email', 'Excel', 'PowerPoint'];
  const formats = ['DOCX', 'PDF', 'CSV', 'PPTX'];

  // The entire JSX structure from the original Home component is moved here
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
                className="transition-colors duration-200"
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept="audio/*,image/*,.pdf,.doc,.docx,.txt"
                multiple
              />
              <Button
                variant="outline"
                onClick={handleUploadClick}
                disabled={isRecording || isTranscribing}
                className="transition-colors duration-200"
              >
                Upload Audio
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleUploadClick}
                disabled={isRecording || isTranscribing}
                className="transition-colors duration-200"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            {/* Transcription Area */}
            <div className="grid w-full gap-2">
              <Label>Transcriptions</Label>
              {transcriptions.length === 0 && !isRecording && !isTranscribing && (
                 <p className="text-sm text-muted-foreground">Your transcriptions will appear here...</p>
              )}
              {transcriptions.map((item) => (
                <Card key={item.id} className="bg-muted p-3">
                  {item.isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{item.text || 'Processing...'}</span>
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
                        onChange={(e) => updateTranscriptionText(item.id, e.target.value)}
                        placeholder="(Empty transcription)"
                        className="text-sm bg-background border-0 focus-visible:ring-1 focus-visible:ring-ring pr-8"
                        rows={Math.max(3, item.text.split('\n').length)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeTranscriptionItem(item.id)}
                        aria-label="Remove transcription"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Attachments Area */}
            <div className="grid w-full gap-2 pt-4 border-t mt-4">
              <Label>Attachments</Label>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files attached yet.</p>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {attachments.map((file, index) => (
                    <li key={index} className="text-sm flex justify-between items-center">
                      <span>{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 h-auto p-1"
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {transcriptionError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {transcriptionError}
                </AlertDescription>
              </Alert>
            )}

            {/* Output Language Selection */}
            <div className="grid w-full max-w-sm items-center gap-1.5 pt-4 border-t mt-4">
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
                    disabled={isLoading || !combinedTranscription}
                    className="transition-colors duration-200"
                  >
                    {isLoading && selectedDocType === type ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : type}
                  </Button>
                ))}
              </div>
            </div>

            {apiError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {apiError}
                </AlertDescription>
              </Alert>
            )}

          </CardContent>
        </Card>

        {/* Right Column: Preview */}
        <Card>
           <CardHeader>
             <CardTitle>2. Preview</CardTitle>
           </CardHeader>
           <CardContent className="flex flex-col gap-4">
             <div className="grid w-full gap-1.5">
               <Label htmlFor="preview-area">Preview (Editable) {isLoading ? '(Generating...)' : ''}</Label>
               <RichTextPreviewEditor
                 value={generatedContent}
                 onChange={setGeneratedContent}
               />
             </div>

             {/* Output Format Selection */}
             <div className="grid w-full gap-1.5 pt-4 border-t mt-4">
               <Label>Select Output Format</Label>
               <div className="flex flex-wrap gap-2">
                 {formats.map(format => (
                   <Button
                     key={format}
                     variant={selectedFormat === format ? "default" : "secondary"}
                     onClick={() => setSelectedFormat(format)}
                     className="transition-colors duration-200"
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
               className="transition-colors duration-200 w-full"
             >
               {isDownloading ? (
                 <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading...</>
               ) : `Download ${selectedFormat || '...'}`}
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
