"use client";

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { SidebarBody, SidebarProvider } from "./sidebar";
import type { LoadedDocumentData } from "./sidebar";
import AuthForm from './AuthForm'; // Import the AuthForm component
import { createClientClient } from '@/lib/supabaseBrowserClient'; // Import Supabase client
import { Dialog } from "@/components/ui/dialog"; // Import Dialog
import { ProfileEditDialogContent } from "@/components/ProfileEditDialog";

// Define type for history items (moved from sidebar.tsx)
interface HistoryItem {
  id: string;
  title: string;
  updated_at: string;
}

// Define the shape of the context data including profile info, dialog state, and history
interface AppContextType {
  loadedDocumentState: CurrentDocumentState | null;
  handleLoadDocument: (data: LoadedDocumentData) => void;
  handleNewDocument: () => void;
  username: string | null;
  avatarUrl: string | null;
  updateUserProfile: (profile: { username?: string | null; avatar_url?: string | null }) => void;
  isProfileDialogOpen: boolean; // State for dialog visibility
  setIsProfileDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openProfileDialog: () => void;
  // Add history state and fetch function to context
  historyItems: HistoryItem[];
  isHistoryLoading: boolean;
  historyError: string | null;
  fetchHistory: () => Promise<void>; // Function to refresh history
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
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  // State for document history (moved from sidebar.tsx)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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
      fetchHistory(); // Fetch initial history as well
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase]); // Dependencies: user, supabase

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

  // Fetch history logic (moved from sidebar.tsx)
  const fetchHistory = useCallback(async () => {
    if (!user) return; // Don't fetch if no user

    console.log("AppLayout: Fetching history...");
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      // Use the browser client here as this runs client-side
      const { data, error } = await supabase
        .from('documents') // Assuming 'documents' is the table name
        .select('id, title, updated_at')
        .eq('user_id', user.id) // Ensure we only get the logged-in user's documents
        .order('updated_at', { ascending: false }); // Order by most recently updated

      if (error) {
        throw error;
      }

      setHistoryItems(data || []);
      console.log("AppLayout: History fetched successfully.", data?.length);
    } catch (error: any) {
      console.error("AppLayout: Error fetching history:", error);
      setHistoryError(error.message || "Unknown error fetching history");
    } finally {
      setIsHistoryLoading(false);
    }
  // Include supabase and user in dependencies
  }, [supabase, user]);

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
    setIsProfileDialogOpen,
    openProfileDialog,
    // Add history state and fetch function to the context value
    historyItems,
    isHistoryLoading,
    historyError,
    fetchHistory,
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
