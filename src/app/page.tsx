"use client"; // Required for hooks like useState

import React, { useState } from 'react';

export default function Home() {
  // Basic state placeholders (will be expanded)
  const [selectedLanguage, setSelectedLanguage] = useState('en-US'); // Default to US English
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');

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
              className="w-full p-2 border rounded" // Basic select, replace with Shadcn later
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          {/* Audio Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2 border rounded ${isRecording ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`} // Basic button, replace later
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <button className="p-2 border rounded bg-blue-500 text-white">Upload Audio</button> {/* Placeholder */}
          </div>

          {/* Transcription Area */}
          <div>
            <label htmlFor="transcription-area" className="block text-sm font-medium mb-1">Transcription (Editable):</label>
            <textarea
              id="transcription-area"
              rows={10}
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              placeholder="Your transcription will appear here..."
              className="w-full p-2 border rounded" // Basic textarea, replace later
            />
          </div>
        </section>

        {/* Right Column: Generation & Download */}
        <section className="flex flex-col gap-4 border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">2. Generate & Download</h2>

          {/* Document Type Selection */}
          <div>
            <p className="block text-sm font-medium mb-1">Select Document Type:</p>
            <div className="flex flex-wrap gap-2">
              {docTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedDocType(type)}
                  className={`p-2 border rounded ${selectedDocType === type ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`} // Basic button
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Content Preview */}
          <div>
            <label htmlFor="preview-area" className="block text-sm font-medium mb-1">Preview:</label>
            <div id="preview-area" className="w-full p-2 border rounded h-40 bg-muted overflow-auto">
              {generatedContent || <span className="text-muted-foreground">Generated content will appear here...</span>}
            </div>
          </div>

          {/* Output Format Selection */}
          <div>
            <p className="block text-sm font-medium mb-1">Select Output Format:</p>
            <div className="flex flex-wrap gap-2">
              {formats.map(format => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-2 border rounded ${selectedFormat === format ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`} // Basic button
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Download Button */}
          <button
            disabled={!generatedContent || !selectedFormat}
            className="p-2 border rounded bg-blue-600 text-white disabled:opacity-50" // Basic button
          >
            Download {selectedFormat}
          </button>
        </section>
      </main>

      <footer className="text-center text-sm text-muted-foreground mt-auto">
        Powered by Next.js, Supabase, Gemini, and Google Cloud Speech.
      </footer>
    </div>
  );
}
