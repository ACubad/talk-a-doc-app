"use client"; // Required for hooks like useState

import React, { useState, useEffect } from 'react';
import { useTranscription } from '@/hooks/useTranscription'; // Import the hook

// TODO: Replace basic elements with Shadcn UI components later
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState('en-US'); // Default to US English
  const [selectedDocType, setSelectedDocType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');

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
        <section className="flex flex-col gap-4 border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">1. Input & Transcribe</h2>

          {/* Language Selection */}
          <div>
            <label htmlFor="language-select" className="block text-sm font-medium mb-1">Select Language:</label>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              // TODO: Replace with Shadcn Select
              className="w-full p-2 border rounded bg-background text-foreground"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-background text-foreground">{lang.name}</option>
              ))}
            </select>
          </div>

          {/* Connection Status */}
           <div className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
             WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
           </div>

          {/* Audio Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording(selectedLanguage); // Pass selected language
                }
              }}
              disabled={!isConnected} // Disable if not connected
              className={`p-2 border rounded ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white disabled:opacity-50 disabled:cursor-not-allowed`} // TODO: Replace with Shadcn Button
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {/* TODO: Implement Upload Audio functionality */}
            <button className="p-2 border rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50" disabled>Upload Audio</button>
          </div>

          {/* Transcription Area */}
          <div>
            <label htmlFor="transcription-area" className="block text-sm font-medium mb-1">Transcription (Editable):</label>
            {/* Display combined final and interim transcription */}
            <textarea
              id="transcription-area"
              rows={10}
              value={transcription + interimTranscription} // Show final + interim
              onChange={(e) => setTranscription(e.target.value)} // Allow manual edits to the final part
              placeholder="Your transcription will appear here..."
              className="w-full p-2 border rounded bg-muted text-foreground" // TODO: Replace with Shadcn Textarea
            />
             {interimTranscription && <p className="text-sm text-muted-foreground italic">Listening...</p>}
          </div>

           {/* Display Errors */}
           {transcriptionError && (
             <div className="p-2 border rounded bg-destructive text-destructive-foreground text-sm"> {/* TODO: Replace with Shadcn Alert */}
               Error: {transcriptionError}
             </div>
           )}
        </section>

        {/* Right Column: Generation & Download */}
        <section className="flex flex-col gap-4 border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">2. Generate & Download</h2>

          {/* Document Type Selection */}
          <div>
            <p className="block text-sm font-medium mb-1">Select Document Type:</p>
            <div className="flex flex-wrap gap-2">
              {docTypes.map(type => (
                // Correctly return the button JSX from the map function
                <button
                  key={type}
                  onClick={() => setSelectedDocType(type)}
                  className={`p-2 border rounded ${selectedDocType === type ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`} // TODO: Replace with Shadcn Button or ToggleGroup
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Content Preview */}
          <div>
            <label htmlFor="preview-area" className="block text-sm font-medium mb-1">Preview:</label>
            {/* TODO: Replace with Shadcn ScrollArea or similar */}
            <div id="preview-area" className="w-full p-2 border rounded h-40 bg-muted overflow-auto text-sm">
              {generatedContent || <span className="text-muted-foreground">Generated content will appear here...</span>}
            </div>
          </div>

          {/* Output Format Selection */}
          {/* TODO: Add API call to generate content on doc type selection */}
          <div>
            <p className="block text-sm font-medium mb-1">Select Output Format:</p>
            <div className="flex flex-wrap gap-2">
              {formats.map(format => (
                 // Correctly return the button JSX from the map function
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-2 border rounded ${selectedFormat === format ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`} // TODO: Replace with Shadcn Button or ToggleGroup
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Download Button */}
          {/* TODO: Add download logic */}
          <button
            disabled={!generatedContent || !selectedFormat}
            className="p-2 border rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed" // TODO: Replace with Shadcn Button
          >
            Download {selectedFormat || '...'}
          </button>
        </section>
      </main>

      <footer className="text-center text-sm text-muted-foreground mt-auto pt-4 border-t">
        Powered by Next.js, Supabase, Gemini, and Google Cloud Speech.
      </footer>
    </div>
  );
}
