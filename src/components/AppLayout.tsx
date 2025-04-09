"use client";

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { SidebarBody } from "./sidebar"; // Remove SidebarProvider import
import type { LoadedDocumentData } from "./sidebar"; // Import the type definition
import AuthForm from './AuthForm'; // Import the AuthForm component
import { createClientClient } from '@/lib/supabaseBrowserClient'; // Import Supabase client
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Import Dialog components for confirmation
import { Button } from "@/components/ui/button"; // Import Button for confirmation dialog
import { ProfileEditDialogContent } from "@/components/ProfileEditDialog"; // Import Profile Dialog Content

// Define the structure for document summaries (used in lists)
// Ensure 'pinned' property is included if your API returns it
export interface DocumentSummary {
  id: string;
  title: string;
  updated_at: string;
  pinned?: boolean; // Add pinned status
}

// Define the shape of the context data including profile info, dialog state, and document list management
interface AppContextType {
  // Existing state
  loadedDocumentState: CurrentDocumentState | null;
  handleLoadDocument: (data: LoadedDocumentData) => void;
  handleNewDocument: () => void;
  username: string | null;
  avatarUrl: string | null;
  updateUserProfile: (profile: { username?: string | null; avatar_url?: string | null }) => void;
  isProfileDialogOpen: boolean;
  setIsProfileDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openProfileDialog: () => void;

  // New state for document list management
  documents: DocumentSummary[];
  isDocumentsLoading: boolean;
  documentsError: string | null;
  fetchDocuments: () => Promise<void>; // Function to fetch/refresh documents
  deleteDocument: (documentId: string) => Promise<void>;
  renameDocument: (documentId: string, newName: string) => Promise<void>;
  pinDocument: (documentId: string) => Promise<void>;
}

// Create the context with a default value (or null/undefined)
const AppContext = createContext<AppContextType | undefined>(undefined);

// Custom hook to use the AppContext (remains the same)

// Custom hook to use the AppContext
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider'); // Keep error message
  }
  return context;
};


interface AppLayoutProps {
  children: React.ReactNode;
  user: any; // Pass user object from layout
}

// Define state structure for the currently loaded document
// This mirrors the state within MainApp that needs to be updated
interface CurrentDocumentState {
  documentId: string | null;
  title: string;
  inputLanguage: string;
  outputLanguage: string;
  docType: string;
  generatedContent: string;
  outputFormat: string;
  transcriptions: Array<{ id: string; text: string; originalFilename?: string; isLoading?: boolean; error?: string | null }>;
  // Add attachments if needed
}

export default function AppLayout({ children, user }: AppLayoutProps) {
  const supabase = createClientClient(); // Initialize Supabase client
  // State to hold the data of the document loaded from history
  const [loadedDocumentState, setLoadedDocumentState] = useState<CurrentDocumentState | null>(null);
  // State for global user profile info
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // State for document list management
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  // --- Document List Management ---

  // Fetch documents function
  const fetchDocuments = useCallback(async () => {
    if (!user) return; // Don't fetch if no user
    setIsDocumentsLoading(true);
    setDocumentsError(null);
    try {
      const response = await fetch('/api/documents/list');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error JSON' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data: DocumentSummary[] = await response.json();
      // Sort documents: pinned first, then by updated_at descending
      const sortedData = (data || []).sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      setDocuments(sortedData);
    } catch (e: any) {
      console.error('Failed to fetch documents:', e);
      setDocumentsError('Failed to load documents. Please try again later.');
      setDocuments([]); // Clear documents on error
    } finally {
      setIsDocumentsLoading(false);
    }
  }, [user]); // Depend on user

  // Fetch initial documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]); // Run fetchDocuments when it's created/updated

  // Function to clear the loaded state (e.g., when clicking "New Document")
  const handleNewDocument = useCallback(() => {
      console.log("AppLayout: Clearing loaded document state for New Document.");
      setLoadedDocumentState(null);
      // Potentially reset other relevant states if needed
  }, []);

  // Delete document function
  const deleteDocument = useCallback(async (documentId: string) => {
    // Confirmation Dialog Logic
    const confirmDelete = await new Promise<boolean>((resolve) => {
      const ConfirmationDialog = () => {
        const [isOpen, setIsOpen] = useState(true);

        const handleConfirm = () => {
          setIsOpen(false);
          resolve(true);
        };

        const handleCancel = () => {
          setIsOpen(false);
          resolve(false);
        };

        return (
          <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resolve(false); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this document? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                <Button variant="destructive" onClick={handleConfirm}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      };

      // Dynamically render the dialog - requires a way to mount it temporarily
      // This is a simplified approach; a more robust solution might use a portal or dedicated modal context
      // For now, we'll use window.confirm as a fallback if dynamic rendering is complex here
      if (window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
          resolve(true);
      } else {
          resolve(false);
      }
      // TODO: Implement dynamic rendering of the ConfirmationDialog if possible
    });

    if (!confirmDelete) {
      console.log("Deletion cancelled by user.");
      return; // Stop if user cancels
    }

    // Proceed with deletion if confirmed
    setDocumentsError(null); // Clear previous errors
    try {
      const response = await fetch(`/api/documents/delete/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error JSON' }));
        throw new Error(errorData.error || `Failed to delete document: ${response.status}`);
      }
      // Remove the document from the local state
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
      console.log(`Document ${documentId} deleted successfully.`);
      // If the deleted document was the currently loaded one, clear it
      if (loadedDocumentState?.documentId === documentId) {
        handleNewDocument(); // Use existing function to clear loaded state
      }
    } catch (error: any) {
      console.error('Error deleting document:', error);
      setDocumentsError(`Failed to delete document: ${error.message}`);
      // Optionally re-fetch documents to ensure consistency
      // await fetchDocuments();
    }
  }, [loadedDocumentState, handleNewDocument]); // Add dependencies

  // Rename document function
  const renameDocument = useCallback(async (documentId: string, newName: string) => {
    setDocumentsError(null);
    try {
      const response = await fetch(`/api/documents/rename/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error JSON' }));
        throw new Error(errorData.error || `Failed to rename document: ${response.status}`);
      }
      const updatedDoc: DocumentSummary = await response.json(); // API returns updated doc
      // Update the document in the local state
      setDocuments(prevDocs => prevDocs.map(doc =>
        doc.id === documentId ? { ...doc, title: updatedDoc.title, updated_at: updatedDoc.updated_at } : doc
      ).sort((a, b) => { // Re-sort after update
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }));
      console.log(`Document ${documentId} renamed successfully to "${updatedDoc.title}".`);
      // If the renamed document was the currently loaded one, update its title
      if (loadedDocumentState?.documentId === documentId) {
        setLoadedDocumentState(prevState => prevState ? { ...prevState, title: updatedDoc.title } : null);
      }
    } catch (error: any) {
      console.error('Error renaming document:', error);
      setDocumentsError(`Failed to rename document: ${error.message}`);
    }
  }, [loadedDocumentState]); // Add dependency

  // Pin/Unpin document function
  const pinDocument = useCallback(async (documentId: string) => {
    setDocumentsError(null);
    try {
      const response = await fetch(`/api/documents/pin/${documentId}`, {
        method: 'PUT',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error JSON' }));
        throw new Error(errorData.error || `Failed to pin/unpin document: ${response.status}`);
      }
      const updatedDoc: DocumentSummary = await response.json(); // API returns updated doc
      // Update the document in the local state and re-sort
      setDocuments(prevDocs => prevDocs.map(doc =>
        doc.id === documentId ? { ...doc, pinned: updatedDoc.pinned, updated_at: updatedDoc.updated_at } : doc
      ).sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }));
      console.log(`Document ${documentId} pin status toggled successfully.`);
    } catch (error: any) {
      console.error('Error pinning/unpinning document:', error);
      setDocumentsError(`Failed to pin/unpin document: ${error.message}`);
    }
  }, []); // No dependencies needed here unless interacting with other state

  // --- End Document List Management ---


  // Fetch initial profile data (username, avatar) on mount if user exists
  useEffect(() => {
    if (user) {
      const fetchInitialProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // Ignore 'no rows' error
            throw error;
          }

          if (data) {
            setUsername(data.username);
            setAvatarUrl(data.avatar_url);
          }
        } catch (err) {
          console.error("Error fetching initial profile:", err);
          // Handle error appropriately, maybe show a notification
        }
      };
      fetchInitialProfile();
    }
  }, [user, supabase]); // Re-run if user or supabase client changes

  // Callback function to handle loading a document into the main view
  const handleLoadDocument = useCallback((data: LoadedDocumentData) => {
    console.log("AppLayout: Loading document - ", data.title);

    // Map the loaded data to the state structure expected by MainApp
    const newState: CurrentDocumentState = {
      documentId: data.id,
      title: data.title,
      inputLanguage: data.input_language, // Map DB field names
      outputLanguage: data.output_language,
      docType: data.document_type,
      generatedContent: data.generated_content,
      outputFormat: data.output_format,
      // Map transcriptions from DB format to the format used in useTranscription hook/MainApp state
      // Add explicit type for 't'
      transcriptions: data.transcriptions.map((t: { id: string; transcribed_text: string; original_filename?: string }) => ({
        id: t.id,
        text: t.transcribed_text,
        originalFilename: t.original_filename,
        isLoading: false,
        error: null,
      // Add explicit types for 'a' and 'b' in sort
      })).sort((a: { id: string }, b: { id: string }) => {
          // Add explicit type for 't' in find
          const orderA = data.transcriptions.find((t: { id: string; order: number }) => t.id === a.id)?.order ?? 0;
          const orderB = data.transcriptions.find((t: { id: string; order: number }) => t.id === b.id)?.order ?? 0;
          return orderA - orderB;
      }),
    };
    setLoadedDocumentState(newState);
  }, []);

  // Function to update global profile state (called from ProfileEditDialog)
  const updateUserProfile = useCallback((profile: { username?: string | null; avatar_url?: string | null }) => {
    console.log("AppLayout: Updating global profile state", profile);
    if (profile.username !== undefined) {
      setUsername(profile.username);
    }
    if (profile.avatar_url !== undefined) {
      setAvatarUrl(profile.avatar_url);
    }
  }, []);

  // Function to open the profile dialog
  const openProfileDialog = useCallback(() => {
    setIsProfileDialogOpen(true);
  }, []);


  // If user is not logged in, show the AuthForm
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
        <AuthForm />
      </div>
    );
  }

  // If user is logged in, render the main application layout

  // Create the context value, including all states and handlers
  const contextValue: AppContextType = {
    // Existing
    loadedDocumentState,
    handleLoadDocument,
    handleNewDocument,
    username,
    avatarUrl,
    updateUserProfile,
    isProfileDialogOpen,
    setIsProfileDialogOpen,
    openProfileDialog,
    // New document list management
    documents,
    isDocumentsLoading,
    documentsError,
    fetchDocuments,
    deleteDocument,
    renameDocument,
    pinDocument,
  };

  return (
    // Remove SidebarProvider wrapper
    <AppContext.Provider value={contextValue}>
      {/* Render the Profile Dialog controlled by AppContext state */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <ProfileEditDialogContent />
      </Dialog>

      {/* Main layout container */}
      <div className="flex flex-col md:flex-row h-screen">
        {/* SidebarBody now gets context implicitly */}
        <SidebarBody />
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900">
          {/* Render page content */}
          {children}
        </main>
      </div>
    </AppContext.Provider>
    // Removed SidebarProvider wrapper
  );
}
