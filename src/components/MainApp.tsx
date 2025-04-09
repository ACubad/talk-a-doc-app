"use client"; // This is now a Client Component

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react'; // Added useContext
import { useTranscription } from '@/hooks/useTranscription';
import { useAppContext } from './AppLayout'; // Import the context hook
// Simple debounce function using setTimeout
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

// Import Shadcn UI components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, X, RefreshCw } from "lucide-react"; // Adjusted imports
import { TooltipProvider } from "@/components/ui/tooltip"; // Only need Provider here now
import InputControls from './InputControls';
import TranscriptionDisplay from './TranscriptionDisplay';
import AttachmentDisplay from './AttachmentDisplay';
import GenerationOptions from './GenerationOptions';
import PreviewArea from './PreviewArea';
import DownloadControls from './DownloadControls';

// Define structure for cache entries
interface DocTypeCacheEntry {
  title: string;
  content: string;
}

// Define the structure for the loaded document state prop
interface CurrentDocumentState {
  documentId: string | null;
  title: string;
  inputLanguage: string;
  outputLanguage: string;
  docType: string;
  generatedContent: string;
  outputFormat: string;
  transcriptions: Array<{ id: string; text: string; originalFilename?: string; isLoading?: boolean; error?: string | null }>;
}

// Remove loadedDocumentState from props
interface MainAppProps {
  // No props needed for loaded state anymore
}

const LOCAL_STORAGE_KEY = 'talkADocAppState';

// Remove prop from function signature
export default function MainApp({}: MainAppProps) {
  // Consume the context
  const { loadedDocumentState } = useAppContext();

  // --- State Initialization ---
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('DOCX'); // Default to DOCX
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading state for initial generation
  const [isDownloading, setIsDownloading] = useState(false); // Loading state for download
  const [apiError, setApiError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]); // State for attached files
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null); // Track saved doc ID
  const [currentDocumentTitle, setCurrentDocumentTitle] = useState<string>(''); // Track saved doc title
  const [isSaving, setIsSaving] = useState(false); // Track saving state for UI feedback
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false); // Flag to prevent saving during initial load
  const [docTypeCache, setDocTypeCache] = useState<Record<string, DocTypeCacheEntry>>({}); // Cache for generated content per docType
  const [isRegenerating, setIsRegenerating] = useState(false); // Loading state specifically for regeneration

  // Use the transcription hook
  const transcriptionHook = useTranscription();
  const {
    isRecording,
    transcriptions, // Get state from hook
    error: transcriptionError,
    isLoading: isTranscribing,
    startRecording,
    stopRecording,
    updateTranscriptionText,
    removeTranscriptionItem,
    sendAudioToApi,
    setTranscriptions, // Add function to update transcriptions state from hook
  } = transcriptionHook;

  // Combine transcriptions from the array for display and generation
  const combinedTranscription = transcriptions.map(t => t.text).join('\n\n---\n\n'); // Join with separator
  // Derived states for enabling/disabling actions
  const canGenerate = !!(combinedTranscription || attachments.length > 0);
  const canRegenerate = !!(selectedDocType && canGenerate);
  const canDownload = !!(generatedContent && selectedFormat);


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


  // --- Save Document Logic ---
  const saveDocument = useCallback(async (docData: {
    documentId?: string | null;
    title: string;
    inputLanguage: string;
    outputLanguage: string;
    documentType: string;
    generatedContent: string;
    outputFormat: string;
    transcriptions: Array<{ text: string; id: string; originalFilename?: string }>; // Use hook's transcription type
  }) => {
    if (!docData.title || !docData.generatedContent) {
      console.log("Save skipped: Missing title or content.");
      return null; // Return null if save skipped
    }
    setIsSaving(true);
    setApiError(null);
    console.log(`Attempting to save document ${docData.documentId ? `(ID: ${docData.documentId})` : '(New)'}...`);
    let savedDocId = docData.documentId;

    try {
      const payload = {
        documentId: docData.documentId,
        title: docData.title,
        inputLanguage: docData.inputLanguage,
        outputLanguage: docData.outputLanguage,
        documentType: docData.documentType,
        generatedContent: docData.generatedContent,
        outputFormat: docData.outputFormat,
        transcriptions: docData.transcriptions.map((t, index) => ({
          transcribed_text: t.text,
          order: index,
          original_filename: t.originalFilename || undefined,
        })),
      };

      const response = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Save API request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('Save successful:', result);
      if (result.documentId) {
        savedDocId = result.documentId; // Update with the returned ID (new or existing)
        // Ensure we pass null if savedDocId is somehow falsy, although result.documentId check should prevent this
        setCurrentDocumentId(savedDocId || null); // Store the new/existing ID
      }
      return savedDocId; // Return the saved ID
    } catch (error) {
      console.error("Save API error:", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred during save.");
      setIsSaving(false);
      return null; // Return null on error
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [currentDocumentId]); // Dependency: currentDocumentId

  // Debounced save function (for subsequent edits)
  const debouncedSave = useCallback(
    debounce((data) => {
        if (data.documentId && data.generatedContent && data.title) {
            console.log("Debounced save triggered...");
            saveDocument(data); // Call saveDocument, but don't need the returned ID here
        } else {
            console.log("Debounced save skipped (no documentId or missing content/title).");
        }
    }, 2000),
    [saveDocument]
  );

  // Effect to trigger debounced save on changes AFTER initial generation/save
  useEffect(() => {
    // Only trigger if we have a document ID and initial load is complete
    if (currentDocumentId && isInitialLoadComplete) {
      const dataToSave = {
        documentId: currentDocumentId,
        title: currentDocumentTitle,
        inputLanguage: selectedLanguage,
        outputLanguage: outputLanguage,
        documentType: selectedDocType,
        generatedContent: generatedContent,
        outputFormat: selectedFormat,
        transcriptions: transcriptions,
      };
      debouncedSave(dataToSave);
    }
  }, [
      transcriptions,
      generatedContent,
      currentDocumentTitle,
      selectedLanguage,
      outputLanguage,
      selectedDocType,
      selectedFormat,
      currentDocumentId,
      debouncedSave,
      isInitialLoadComplete // Added to prevent saving during load
  ]);

  // --- localStorage Persistence ---

  // Effect to LOAD state from localStorage on initial mount
  useEffect(() => {
    console.log("MainApp: Attempting to load state from localStorage...");
    const savedStateString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateString) {
      try {
        const savedState = JSON.parse(savedStateString);
        console.log("MainApp: Found saved state:", savedState);
        if (savedState.selectedLanguage) setSelectedLanguage(savedState.selectedLanguage);
        if (savedState.outputLanguage) setOutputLanguage(savedState.outputLanguage);
        if (savedState.selectedDocType) setSelectedDocType(savedState.selectedDocType);
        if (savedState.selectedFormat) setSelectedFormat(savedState.selectedFormat);
        if (savedState.generatedContent) setGeneratedContent(savedState.generatedContent);
        if (savedState.transcriptions) setTranscriptions(savedState.transcriptions);
        if (savedState.currentDocumentId) setCurrentDocumentId(savedState.currentDocumentId);
        if (savedState.currentDocumentTitle) setCurrentDocumentTitle(savedState.currentDocumentTitle);
        // Restore cache if needed? Maybe not, let it regenerate on first click.
        // if (savedState.docTypeCache) setDocTypeCache(savedState.docTypeCache);
      } catch (error) {
        console.error("Failed to parse saved state from localStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } else {
      console.log("MainApp: No saved state found in localStorage.");
    }
    setIsInitialLoadComplete(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs only once on mount

  // Debounced function to SAVE state to localStorage
  const debouncedSaveToLocalStorage = useCallback(
    debounce(() => {
      if (isInitialLoadComplete && !loadedDocumentState) {
        console.log("MainApp: Saving state to localStorage...");
        const stateToSave = {
          selectedLanguage,
          outputLanguage,
          selectedDocType,
          selectedFormat,
          generatedContent,
          transcriptions,
          currentDocumentId,
          currentDocumentTitle,
          // docTypeCache, // Optionally save cache? Might get large. Let's skip for now.
        };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
          console.error("Failed to save state to localStorage:", error);
        }
      } else {
         console.log("MainApp: Skipping save to localStorage (initial load not complete or history item loaded).");
      }
    }, 1000),
    [
      isInitialLoadComplete,
      loadedDocumentState,
      selectedLanguage,
      outputLanguage,
      selectedDocType,
      selectedFormat,
      generatedContent,
      transcriptions,
      currentDocumentId,
      currentDocumentTitle,
      // docTypeCache // Add if saving cache
    ]
  );

  // Effect to trigger SAVE state to localStorage when relevant state changes
  useEffect(() => {
    debouncedSaveToLocalStorage();
  }, [debouncedSaveToLocalStorage]);

  // --- Cache Invalidation Logic ---
  // Effect to clear cache when core inputs change (transcriptions, attachments, languages)
  useEffect(() => {
    if (isInitialLoadComplete) {
      console.log("MainApp: Clearing docTypeCache due to input change (transcription, attachment, language).");
      setDocTypeCache({});
    }
  }, [transcriptions, attachments, selectedLanguage, outputLanguage, isInitialLoadComplete]);

  // Effect to update state when a document is loaded from history OR "New Document" is clicked
  useEffect(() => {
    if (!isInitialLoadComplete) {
        console.log("MainApp: Skipping history/new effect until initial load complete.");
        return;
    }

    console.log("MainApp: History/New Document effect triggered. loadedDocumentState:", loadedDocumentState);

    if (loadedDocumentState) {
      // --- Load from History ---
      console.log("MainApp: Applying loaded document state -", loadedDocumentState.title);
      setCurrentDocumentId(loadedDocumentState.documentId);
      setCurrentDocumentTitle(loadedDocumentState.title);
      setSelectedLanguage(loadedDocumentState.inputLanguage);
      setOutputLanguage(loadedDocumentState.outputLanguage);
      setSelectedDocType(loadedDocumentState.docType);
      setGeneratedContent(loadedDocumentState.generatedContent);
      setSelectedFormat(loadedDocumentState.outputFormat);
      const loadedTranscriptions = loadedDocumentState.transcriptions.map(t => ({
          id: t.id,
          text: t.text,
          // Remove originalFilename mapping as it's not part of the hook's internal type
          isLoading: false,
          error: null,
      }));
      setTranscriptions(loadedTranscriptions);
      setAttachments([]);
      setApiError(null);
    } else {
      // --- Handle "New Document" ---
      console.log("MainApp: Resetting state for New Document.");
      setCurrentDocumentId(null);
      setCurrentDocumentTitle('');
      // Keep language selections? Reset others.
      setSelectedDocType('');
      setGeneratedContent('');
      setTranscriptions([]);
      setAttachments([]);
      setApiError(null);
      setIsLoading(false);
      setIsDownloading(false);
      setIsSaving(false);
      setIsRegenerating(false);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      console.log("MainApp: Cleared localStorage for New Document.");
    }
    // Clear cache when loading from history or creating new doc
    setDocTypeCache({});
    console.log("MainApp: Cleared docTypeCache due to history load or new document.");
  }, [loadedDocumentState, setTranscriptions, isInitialLoadComplete]);


  // --- Generate Content Logic ---

  // Function to perform the actual API call and update state/cache
  const triggerActualGeneration = useCallback(async (docType: string, isRegen: boolean = false) => {
    if (!combinedTranscription && attachments.length === 0) { // Check both
      setApiError("Please provide transcription text or attach a file first.");
      return;
    }
    if (isRegen) {
      setIsRegenerating(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);
    if (!isRegen) {
        setGeneratedContent(''); // Clear previous content only on initial generation
    }
    setSelectedDocType(docType); // Ensure selected type is updated

    let newDocId = currentDocumentId; // Assume update unless initial save returns new ID

    try {
      const formData = new FormData();
      formData.append('transcription', combinedTranscription);
      formData.append('docType', docType);
      formData.append('outputLanguage', outputLanguage);
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      console.log('Sending FormData to /api/generate...');
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const newTitle = data.generatedTitle || 'Untitled Document';
      const newContent = data.generatedContent;

      setGeneratedContent(newContent);
      setCurrentDocumentTitle(newTitle);

      // --- Trigger Save ---
      // Save immediately after generation (initial or regeneration)
      // If it's the very first generation for this session (no currentDocumentId), saveDocument performs an insert.
      // If regenerating an existing document, saveDocument performs an update using currentDocumentId.
      const savedId = await saveDocument({
        documentId: currentDocumentId, // Pass current ID (null for first time)
        title: newTitle,
        inputLanguage: selectedLanguage,
        outputLanguage: outputLanguage,
        documentType: docType,
        generatedContent: newContent,
        outputFormat: selectedFormat,
        transcriptions: transcriptions,
      });

      if (savedId && !currentDocumentId) {
          newDocId = savedId; // Update local state if a new ID was returned
          setCurrentDocumentId(savedId);
      }

      // Update cache
      setDocTypeCache(prevCache => ({
        ...prevCache,
        [docType]: { title: newTitle, content: newContent }
      }));

    } catch (error) {
      console.error("Generation API error:", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred during generation.");
    } finally {
      if (isRegen) {
        setIsRegenerating(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [
    combinedTranscription,
    outputLanguage,
    attachments,
    saveDocument,
    selectedLanguage,
    selectedFormat,
    transcriptions,
    setDocTypeCache,
    currentDocumentId // Include currentDocumentId dependency for saving
  ]);

  // Handle clicking a document type button (checks cache first)
  const handleGenerateContent = async (docType: string) => {
    setSelectedDocType(docType); // Set the type immediately for UI feedback

    // Check cache
    const cachedEntry = docTypeCache[docType];
    if (cachedEntry) {
      console.log(`Cache hit for docType: ${docType}. Displaying cached content.`);
      setGeneratedContent(cachedEntry.content);
      setCurrentDocumentTitle(cachedEntry.title);
      setApiError(null);
      return; // Use cached content, no API call or save needed
    }

    // If not in cache, trigger the actual generation
    console.log(`Cache miss for docType: ${docType}. Triggering generation.`);
    await triggerActualGeneration(docType, false);
  };

  // Handle clicking the regenerate button (forces generation)
  const handleRegenerateContent = async () => {
    if (!selectedDocType) {
      setApiError("Please select a document type first to regenerate.");
      return;
    }
    if (!combinedTranscription && attachments.length === 0) {
        setApiError("Cannot regenerate without transcription or attachments.");
        return;
    }
    console.log(`Regeneration requested for docType: ${selectedDocType}.`);
    await triggerActualGeneration(selectedDocType, true); // Pass true for isRegen
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
          docType: selectedDocType // Pass docType for potential format-specific logic
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
      // Use currentDocumentTitle for a better filename if available
      const baseFilename = currentDocumentTitle || 'generated_document';
      filename = `${baseFilename}.${selectedFormat.toLowerCase()}`;

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
    // Add more languages as needed
  ];

  const outputLanguages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'tr', name: 'Turkish' },
      { code: 'sw', name: 'Swahili' },
      { code: 'de', name: 'German' },
      // Add more languages as needed
  ];

  const docTypes = ['Report', 'Email', 'Excel', 'PowerPoint']; // Keep these simple strings
  const formats = ['DOCX', 'PDF', 'CSV', 'PPTX']; // Keep these simple strings

  // Callback for InputControls record toggle
  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Callback for AttachmentDisplay removal
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };


  // The entire JSX structure from the original Home component is moved here
  return (
    <TooltipProvider> {/* Wrap with TooltipProvider */}
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold">Talk A Doc</h1>
          <p className="text-muted-foreground">Generate documents from your voice.</p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Input & Transcription */}
          <Card>
            <CardHeader>
              <CardTitle>1. Input & Transcribe</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept="audio/*,image/*,.pdf,.doc,.docx,.txt"
                multiple={false}
              />

              <InputControls
                languages={languages}
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                onRecordToggle={handleRecordToggle}
                onUploadClick={handleUploadClick}
              />

              <TranscriptionDisplay
                transcriptions={transcriptions}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                onUpdateText={updateTranscriptionText}
                onRemoveItem={removeTranscriptionItem}
              />

              <AttachmentDisplay
                attachments={attachments}
                onRemoveAttachment={handleRemoveAttachment}
              />

              {transcriptionError && (
                <Alert variant="destructive">
                  <AlertTitle>Transcription Error</AlertTitle>
                  <AlertDescription>{transcriptionError}</AlertDescription>
                </Alert>
              )}

              <GenerationOptions
                outputLanguages={outputLanguages}
                selectedOutputLanguage={outputLanguage}
                onOutputLanguageChange={setOutputLanguage}
                docTypes={docTypes}
                selectedDocType={selectedDocType}
                onGenerateContent={handleGenerateContent}
                isLoading={isLoading}
                isRegenerating={isRegenerating}
                canGenerate={canGenerate}
              />

              {/* Display general API errors here */}
              {apiError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

            </CardContent>
          </Card>

          {/* Right Column: Preview & Download */}
          <Card>
            <PreviewArea
              generatedContent={generatedContent}
              onContentChange={setGeneratedContent}
              currentDocumentTitle={currentDocumentTitle}
              currentDocumentId={currentDocumentId}
              isLoading={isLoading}
              isRegenerating={isRegenerating}
              isSaving={isSaving}
              selectedDocType={selectedDocType}
              canRegenerate={canRegenerate}
              onRegenerate={handleRegenerateContent}
            />
            {/* Place DownloadControls within the Card but outside PreviewArea's CardContent */}
            <CardContent>
              <DownloadControls
                formats={formats}
                selectedFormat={selectedFormat}
                onFormatChange={setSelectedFormat}
                onDownload={handleDownload}
                canDownload={canDownload}
                isDownloading={isDownloading}
                isLoading={isLoading}
                isRegenerating={isRegenerating}
                isSaving={isSaving}
              />
            </CardContent>
          </Card>
        </main>

        <footer className="text-center text-sm text-muted-foreground pt-8 border-t mt-8">
          Powered by Next.js, Supabase, Gemini, and Google Cloud Speech.
        </footer>
      </div>
    </TooltipProvider>
  );
}
