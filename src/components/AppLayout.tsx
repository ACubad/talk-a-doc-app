"use client";

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react'; // Added useEffect
import { SidebarBody, SidebarProvider } from "./sidebar"; // Import SidebarBody and SidebarProvider
import type { LoadedDocumentData } from "./sidebar"; // Import the type definition
import AuthForm from './AuthForm'; // Import the AuthForm component
import { createClientClient } from '@/lib/supabaseBrowserClient'; // Import Supabase client
import { Dialog } from "@/components/ui/dialog"; // Import Dialog
import { ProfileEditDialogContent } from "@/components/ProfileEditDialog"; // Import Profile Dialog Content

// Define the shape of the context data including profile info and dialog state
interface AppContextType {
  loadedDocumentState: CurrentDocumentState | null;
  handleLoadDocument: (data: LoadedDocumentData) => void;
  handleNewDocument: () => void;
  username: string | null;
  avatarUrl: string | null;
  updateUserProfile: (profile: { username?: string | null; avatar_url?: string | null }) => void;
  isProfileDialogOpen: boolean; // State for dialog visibility
  setIsProfileDialogOpen: React.Dispatch<React.SetStateAction<boolean>>; // Setter for dialog state
  openProfileDialog: () => void; // Function to open dialog
}

// Create the context with a default value (or null/undefined)
const AppContext = createContext<AppContextType | undefined>(undefined);

// Custom hook to use the AppContext
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
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
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false); // Add state for profile dialog

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

  // Callback function passed to the Sidebar
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

  // Function to clear the loaded state (e.g., when clicking "New Document")
  const handleNewDocument = useCallback(() => {
      console.log("AppLayout: Clearing loaded document state for New Document.");
      setLoadedDocumentState(null);
      // Potentially reset other relevant states if needed
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

  // Create the context value, including profile state and update function
  const contextValue: AppContextType = {
    loadedDocumentState,
    handleLoadDocument,
    handleNewDocument,
    username,
    avatarUrl,
    updateUserProfile,
    isProfileDialogOpen, // Add dialog state
    setIsProfileDialogOpen, // Add dialog setter
    openProfileDialog, // Add function to open dialog
  };

  return (
    // Restore SidebarProvider
    <SidebarProvider onLoadDocument={handleLoadDocument}>
      <AppContext.Provider value={contextValue}>
        {/* Render the Profile Dialog controlled by AppContext state */}
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <ProfileEditDialogContent />
        </Dialog>

        {/* Main layout container */}
        <div className="flex flex-col md:flex-row h-screen">
          {/* Restore SidebarBody */}
          <SidebarBody />
          {/* Main content area */}
          <main className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900">
            {/* Render page content */}
            {children}
          </main>
        </div>
      </AppContext.Provider>
    </SidebarProvider> // Restored
  );
}
