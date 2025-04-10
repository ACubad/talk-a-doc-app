"use client";

import { cn } from "../lib/utils"; // Corrected import path
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext, useEffect, useCallback, FC } from "react"; // Added FC
import { useRouter } from 'next/navigation'; // Import useRouter
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  Loader2, // Added Loader icon
  X,
  FilePenLine,
  Search,
  FolderKanban,
  MoreHorizontal, // Added for dropdown trigger
  Trash2, // Added for delete action
  Pin, // Added for pin action
  Pencil, // Added for rename action
  Settings,
  LogOut,
  PinOff, // Added for unpin action
} from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";
import LogoutButton from "./LogoutButton";
import { Button } from "./ui/button";
import { useAppContext } from "./AppLayout";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal, // Import Portal
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Dialog related imports are no longer needed here for MobileSidebar profile
// Keep Dialog for Profile Edit, add AlertDialog for Delete Confirmation
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // We might trigger differently
} from "@/components/ui/alert-dialog";
// We'll need Input and Label for the Rename Dialog later
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { ProfileEditDialogContent } from "@/components/ProfileEditDialog";
import { RenameDocumentDialog } from "./RenameDocumentDialog"; // Import the new dialog
// TODO: Import DeleteConfirmationDialog when created

// HistoryItem type is now defined in AppLayout.tsx

// Define the structure for the loaded document data (matching the load API response)
// Export this interface so other components can use it
export interface LoadedDocumentData {
  id: string;
  title: string;
  input_language: string;
  output_language: string;
  document_type: string;
  generated_content: string;
  output_format: string;
  created_at: string;
  updated_at: string;
  transcriptions: Array<{
    id: string;
    transcribed_text: string;
    order: number;
    original_filename?: string;
  }>;
}


interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

// Define context props including the callback
interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  onLoadDocument?: (data: LoadedDocumentData) => void; // Add to context
}

// Create context
const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

// Custom hook to use sidebar context
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// Define props for SidebarProvider
interface SidebarProviderProps {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  onLoadDocument?: (data: LoadedDocumentData) => void; // Accept callback prop here
}

// SidebarProvider component
export const SidebarProvider: FC<SidebarProviderProps> = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
  onLoadDocument, // Destructure the callback prop
}) => {
  // Default open state back to false
  const [openState, setOpenState] = useState(false);

  // Allow parent to control open state (though default is now false)
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  // Create the context value including the callback
  const contextValue: SidebarContextProps = {
    open,
    setOpen,
    animate,
    onLoadDocument // Assign the prop to the context field
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
};

// Define props for the main Sidebar component
interface SidebarProps {
  children?: React.ReactNode; // Children might not be needed if structure is internal
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  onLoadDocument?: (data: LoadedDocumentData) => void; // Accept callback prop here too
}

// Main Sidebar component
export const Sidebar: FC<SidebarProps> = ({
  children,
  open,
  setOpen,
  animate,
  onLoadDocument, // Destructure callback prop
}) => {
  return (
    // Pass onLoadDocument to the Provider
    <SidebarProvider open={open} setOpen={setOpen} animate={animate} onLoadDocument={onLoadDocument}>
      {/* SidebarBody no longer needs onLoadDocument prop or children */}
      <SidebarBody /> {/* Removed {children} */}
    </SidebarProvider>
  );
};

// SidebarBody component - Remove unused children prop
export const SidebarBody = () => { // Removed children prop
  return (
    <>
      {/* Desktop/Mobile sidebars will get onLoadDocument from context */}
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
};

// Define props for DesktopSidebar (excluding onLoadDocument)
type DesktopSidebarProps = React.ComponentProps<typeof motion.div> & {
    children?: React.ReactNode; // Keep children prop if layout.tsx still passes structure
};

// DesktopSidebar component
export const DesktopSidebar: FC<DesktopSidebarProps> = ({
  className,
  children,
  ...props
}) => {
  // Get onLoadDocument from context
  const { open, setOpen, animate, onLoadDocument } = useSidebar();
  // Get profile info, handleNewDocument, and history state/functions from AppContext
  const {
    handleNewDocument,
    username,
    avatarUrl,
    historyItems, // Use context state
    isHistoryLoading, // Use context state
    historyError, // Use context state
    // Get action handlers from context
    renameDocument,
    pinDocument,
    deleteDocument,
    // fetchHistory is now handled by AppLayout's useEffect
  } = useAppContext();
  const router = useRouter();
  // Local state for tracking which doc is currently being loaded
  const [isLoadingDoc, setIsLoadingDoc] = useState<string | null>(null);
  // Local state for managing dialogs
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string; title: string; pinned?: boolean } | null>(null);

  // Remove local fetchHistory function and useEffect hook

  // Handle loading document logic (uses onLoadDocument from SidebarContext)
  const handleLoadDocument = async (documentId: string) => {
    if (!onLoadDocument) return;
    setIsLoadingDoc(documentId);
    // setHistoryError(null); // Removed - Error state is now global for list fetching
    try {
      const response = await fetch(`/api/documents/load/${documentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to load document: ${response.status}`);
      }
      const data: LoadedDocumentData = await response.json();
      onLoadDocument(data);
      router.push('/'); // Navigate to main page after loading
    } catch (error) {
      console.error(`Error loading document ${documentId}:`, error);
      // setHistoryError(error instanceof Error ? error.message : "Unknown error loading document"); // Removed - Error state is now global
      // TODO: Consider adding local error handling/notification for load failure if needed
    } finally {
      setIsLoadingDoc(null);
    }
  };

  // Restore conditional padding/alignment
  const paddingX = open ? "px-4" : "px-3";
  const alignItems = !open ? "items-center" : "";

  // JSX structure
  return (
    <motion.div
      // Restore conditional styles and animation/hover handlers
      className={cn(
        "h-full py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[300px] flex-shrink-0", // Removed overflow-hidden here
        paddingX, // Restore conditional padding
        alignItems, // Restore conditional alignment
        className
      )}
      // Restore animation and hover handlers
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      onMouseEnter={() => setOpen(true)} // Restore
      onMouseLeave={() => setOpen(false)} // Restore
      {...props}
    >
      {/* Restore conditional padding */}
      <div className={cn("flex flex-col h-full", !open ? "p-3" : "p-4")}>
        {/* Top Static Section */}
        <div>
          {/* Add onClick handler specifically for New Document */}
          <SidebarLink
            link={{
              label: "New Document",
              href: "/",
              icon: <FilePenLine className="w-4 h-4" />,
            }}
            onClick={handleNewDocument} // Call the context function on click
          />
          {/* Restore conditional rendering */}
          {open && (
            <div className="relative my-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500 w-4 h-4" />
              <input
                type="search"
                placeholder="Search docs..."
                className="w-full pl-8 pr-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
          <SidebarLink
            link={{
              label: "Docs",
              href: "/docs",
              icon: <FolderKanban className="w-4 h-4" />,
            }}
          />
        </div>

        {/* Middle Scrollable History Section - Restore conditional rendering */}
        {/* Ensure ScrollArea itself doesn't clip */}
        {open && (
          <ScrollArea className="flex-grow my-4 border-t border-b border-neutral-200 dark:border-neutral-700 overflow-visible"> {/* Added overflow-visible */}
            <div className="p-2">
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2">History</h3>
              {isHistoryLoading && (
                <div className="flex items-center justify-center p-2 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                </div>
              )}
              {historyError && (
                <div className="p-2 text-sm text-red-600 dark:text-red-400">Error: {historyError}</div>
              )}
              {!isHistoryLoading && !historyError && historyItems.length === 0 && (
                 <div className="p-2 text-sm text-neutral-500">No saved documents found.</div>
              )}
              {!isHistoryLoading && !historyError && historyItems.map(item => {
                // Prepare handlers for dialog triggers and direct actions
                const openRenameDialog = () => {
                  setSelectedDoc(item);
                  setIsRenameDialogOpen(true);
                };
                const openDeleteDialog = () => {
                  setSelectedDoc(item);
                  setIsDeleteDialogOpen(true);
                };
                const togglePin = () => {
                  pinDocument(item.id, !item.pinned); // Call context function directly
                };

                return (
                  // Revert to div wrapping Button and DropdownMenu separately
                  <div key={item.id} className="flex items-center justify-between group hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md pr-1">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {/* Use the Grid layout */}
                          <Button
                            variant="ghost"
                            className="flex-1 text-sm py-1 px-2 h-auto font-normal text-neutral-700 dark:text-neutral-300 hover:bg-transparent dark:hover:bg-transparent rounded-md grid grid-cols-[auto_1fr] items-center justify-start w-full text-left gap-1.5"
                            onClick={() => handleLoadDocument(item.id)}
                            disabled={isLoadingDoc === item.id}
                          >
                            <span className="w-4 h-4 flex items-center justify-center"> {/* Icon container */}
                              {isLoadingDoc === item.id ? ( <Loader2 className="h-4 w-4 animate-spin" /> )
                               : item.pinned ? ( <Pin className="h-3 w-3 text-blue-500" /> )
                               : null }
                            </span>
                            <span className="block truncate">{item.title || 'Untitled Document'}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="start">
                          <p>{item.title || 'Untitled Document'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {/* Dropdown Menu placed after the main button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      {/* Wrap Content in Portal */}
                      <DropdownMenuPortal>
                        <DropdownMenuContent align="end" sideOffset={5} onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onSelect={openRenameDialog}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={togglePin}>
                            {item.pinned ? ( <PinOff className="mr-2 h-4 w-4" /> ) : ( <Pin className="mr-2 h-4 w-4" /> )}
                            <span>{item.pinned ? 'Unpin' : 'Pin to top'}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={openDeleteDialog} className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Dialogs (Rendered conditionally based on state) */}
        <RenameDocumentDialog
          isOpen={isRenameDialogOpen}
          onOpenChange={(open) => {
            setIsRenameDialogOpen(open);
            if (!open) setSelectedDoc(null); // Clear selected doc when closing
          }}
          documentId={selectedDoc?.id ?? null}
          currentTitle={selectedDoc?.title ?? null}
        />

        {/* Delete Confirmation Dialog (Using AlertDialog for now) */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) setSelectedDoc(null); // Clear selected doc when closing
          }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the document
                "{selectedDoc?.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedDoc(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (selectedDoc) {
                    deleteDocument(selectedDoc.id); // Call context function
                  }
                  setSelectedDoc(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        {/* Bottom Static Section */}
        <div className="mt-auto">
          {/* User Profile Section with Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer">
                {/* Display actual avatar or placeholder */}
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username || 'User Avatar'} className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
                ) : (
                  <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full flex-shrink-0"></div>
                )}
                {/* Display actual username or fallback */}
                {open && (
                  <span className="text-sm text-neutral-700 dark:text-neutral-200 truncate">
                    {username || 'User'}
                  </span>
                )}
              </div>
            </DialogTrigger>
            <ProfileEditDialogContent />
          </Dialog>
          {/* End User Profile Section */}
          <SidebarLink
            link={{
              label: "Settings",
              href: "/settings",
              icon: <Settings className="w-4 h-4" />,
            }}
          />
          {/* Pass original open state to LogoutButton */}
          <LogoutButton open={open} />
        </div>
      </div>
    </motion.div>
  );
};

// Define props for MobileSidebar (excluding onLoadDocument)
type MobileSidebarProps = React.ComponentProps<"div"> & {
    children?: React.ReactNode; // Keep children prop if layout.tsx still passes structure
};

// MobileSidebar component
export const MobileSidebar: FC<MobileSidebarProps> = ({
  className,
  children,
  ...props
}) => {
  // Get onLoadDocument from context
  const { open, setOpen, onLoadDocument } = useSidebar();
  // Get profile info, handleNewDocument, openProfileDialog, and history state/functions from AppContext
  const {
    handleNewDocument,
    username,
    avatarUrl,
    openProfileDialog,
    historyItems, // Use context state
    isHistoryLoading, // Use context state
    historyError, // Use context state
    // Get action handlers from context
    renameDocument,
    pinDocument,
    deleteDocument,
    // fetchHistory is now handled by AppLayout's useEffect
  } = useAppContext();
  const router = useRouter();
  // Local state for tracking which doc is currently being loaded
  const [isLoadingDoc, setIsLoadingDoc] = useState<string | null>(null);
  // Local state for managing dialogs (mirrors DesktopSidebar)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string; title: string; pinned?: boolean } | null>(null);

  // Remove local fetchHistory function and useEffect hook

  // Handle loading document logic (uses onLoadDocument from SidebarContext)
  const handleLoadDocument = async (documentId: string) => {
    if (!onLoadDocument) return;
    setIsLoadingDoc(documentId);
    // setHistoryError(null); // Removed - Error state is now global for list fetching
    try {
      const response = await fetch(`/api/documents/load/${documentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to load document: ${response.status}`);
      }
      const data: LoadedDocumentData = await response.json();
      onLoadDocument(data);
      router.push('/'); // Navigate to main page after loading
      setOpen(false); // Close mobile sidebar after loading
    } catch (error) {
      console.error(`Error loading document ${documentId}:`, error);
      // setHistoryError(error instanceof Error ? error.message : "Unknown error loading document"); // Removed - Error state is now global
      // TODO: Consider adding local error handling/notification for load failure if needed
    } finally {
      setIsLoadingDoc(null);
    }
  };

  // JSX structure (remains the same)
  return (
    <>
      {/* Mobile Header */}
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-start bg-neutral-100 dark:bg-neutral-800 w-full" // Changed justify-between to justify-start
        )}
        {...props}
      >
        {/* Moved Menu icon out of the inner div and removed the inner div */}
        <Menu
          className="text-neutral-800 dark:text-neutral-200 cursor-pointer z-20" // Added z-20 here
          onClick={() => setOpen(!open)}
        />
        {/* Removed the inner div: <div className="flex justify-end z-20 w-full"> */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              <div className="flex flex-col h-full pt-10">
                {/* Top Static Section */}
                <div>
                  {/* Add onClick handler specifically for New Document */}
                  <SidebarLink
                    link={{
                      label: "New Document",
                      href: "/",
                      icon: <FilePenLine className="w-4 h-4" />,
                    }}
                    onClick={() => {
                      handleNewDocument(); // Call context function
                      setOpen(false); // Close mobile sidebar
                    }}
                  />
                  <div className="relative my-4">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500 w-4 h-4" />
                    <input
                      type="search"
                      placeholder="Search docs..."
                      className="w-full pl-8 pr-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <SidebarLink
                    link={{
                      label: "Docs",
                      href: "/docs",
                      icon: <FolderKanban className="w-4 h-4" />,
                    }}
                    onClick={() => setOpen(false)} // Close mobile sidebar on Docs click
                  />
                </div>

                {/* Middle Scrollable History Section - Mobile */}
                <ScrollArea className="flex-grow my-4 border-t border-b border-neutral-200 dark:border-neutral-700 overflow-visible"> {/* Added overflow-visible */}
                  <div className="p-2">
                    <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2">History</h3>
                    {isHistoryLoading && (
                      <div className="flex items-center justify-center p-2 text-sm text-neutral-500">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                      </div>
                    )}
                    {historyError && (
                      <div className="p-2 text-sm text-red-600 dark:text-red-400">Error: {historyError}</div>
                    )}
                    {!isHistoryLoading && !historyError && historyItems.length === 0 && (
                       <div className="p-2 text-sm text-neutral-500">No saved documents found.</div>
                    )}
                    {!isHistoryLoading && !historyError && historyItems.map(item => {
                      // Prepare handlers for dialog triggers and direct actions (mirrors DesktopSidebar)
                      const openRenameDialog = () => {
                        setSelectedDoc(item);
                        setIsRenameDialogOpen(true);
                      };
                      const openDeleteDialog = () => {
                        setSelectedDoc(item);
                        setIsDeleteDialogOpen(true);
                      };
                      const togglePin = () => {
                        pinDocument(item.id, !item.pinned); // Call context function directly
                      };

                      return (
                        // Revert to div wrapping Button and DropdownMenu separately
                        <div key={item.id} className="flex items-center justify-between group hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md pr-1">
                           <TooltipProvider delayDuration={100}>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 {/* Use the Grid layout from previous attempt */}
                                 <Button
                                   variant="ghost"
                                   className="flex-1 text-sm py-1 px-2 h-auto font-normal text-neutral-700 dark:text-neutral-300 hover:bg-transparent dark:hover:bg-transparent rounded-md grid grid-cols-[auto_1fr] items-center justify-start w-full text-left gap-1.5"
                                   onClick={() => handleLoadDocument(item.id)}
                                   disabled={isLoadingDoc === item.id}
                                 >
                                   <span className="w-4 h-4 flex items-center justify-center">
                                     {isLoadingDoc === item.id ? ( <Loader2 className="h-4 w-4 animate-spin" /> )
                                      : item.pinned ? ( <Pin className="h-3 w-3 text-blue-500" /> )
                                      : null }
                                   </span>
                                   <span className="block truncate">{item.title || 'Untitled Document'}</span>
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent side="right" align="start">
                                 <p>{item.title || 'Untitled Document'}</p>
                               </TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                         {/* Dropdown Menu placed after the main button */}
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0">
                               <MoreHorizontal className="h-4 w-4" />
                               <span className="sr-only">More options</span>
                             </Button>
                           </DropdownMenuTrigger>
                           {/* Wrap Content in Portal */}
                           <DropdownMenuPortal>
                             <DropdownMenuContent align="end" sideOffset={5} onClick={(e) => e.stopPropagation()}>
                               <DropdownMenuItem onSelect={openRenameDialog}>
                                 <Pencil className="mr-2 h-4 w-4" />
                                 <span>Rename</span>
                               </DropdownMenuItem>
                               <DropdownMenuItem onSelect={togglePin}>
                                 {item.pinned ? ( <PinOff className="mr-2 h-4 w-4" /> ) : ( <Pin className="mr-2 h-4 w-4" /> )}
                                 <span>{item.pinned ? 'Unpin' : 'Pin to top'}</span>
                               </DropdownMenuItem>
                               <DropdownMenuSeparator />
                               <DropdownMenuItem onSelect={openDeleteDialog} className="text-red-600 focus:text-red-600">
                                 <Trash2 className="mr-2 h-4 w-4" />
                                 <span>Delete</span>
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenuPortal>
                         </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                 {/* Dialogs (Rendered conditionally based on state) - Copied from DesktopSidebar */}
                 <RenameDocumentDialog
                   isOpen={isRenameDialogOpen}
                   onOpenChange={(open) => {
                     setIsRenameDialogOpen(open);
                     if (!open) setSelectedDoc(null); // Clear selected doc when closing
                   }}
                   documentId={selectedDoc?.id ?? null}
                   currentTitle={selectedDoc?.title ?? null}
                 />

                 {/* Delete Confirmation Dialog (Using AlertDialog for now) */}
                 <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                     setIsDeleteDialogOpen(open);
                     if (!open) setSelectedDoc(null); // Clear selected doc when closing
                   }}>
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                       <AlertDialogDescription>
                         This action cannot be undone. This will permanently delete the document
                         "{selectedDoc?.title}".
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel onClick={() => setSelectedDoc(null)}>Cancel</AlertDialogCancel>
                       <AlertDialogAction
                         className="bg-red-600 hover:bg-red-700"
                         onClick={() => {
                           if (selectedDoc) {
                             deleteDocument(selectedDoc.id); // Call context function
                           }
                           setSelectedDoc(null);
                         }}
                       >
                         Delete
                       </AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>

                {/* Bottom Static Section */}
                <div className="mt-auto pb-4">
                  {/* User Profile Section Display (Click triggers dialog via context AND closes sidebar) */}
                  <div
                    className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                    onClick={() => {
                      openProfileDialog(); // Call context function to open dialog
                      setOpen(false); // Explicitly close sidebar
                    }}
                  >
                    {/* Display actual avatar or placeholder */}
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username || 'User Avatar'} className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
                    ) : (
                      <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full flex-shrink-0"></div>
                    )}
                    {/* Display actual username or fallback */}
                    <span className="text-sm text-neutral-700 dark:text-neutral-200 truncate">
                      {username || 'User'}
                    </span>
                  </div>
                  {/* End User Profile Section Display */}
                  {/* Removed the Dialog component from here */}

                  <SidebarLink
                    link={{
                      label: "Settings",
                      href: "/settings",
                      icon: <Settings className="w-4 h-4" />,
                    }}
                    onClick={() => setOpen(false)} // Close mobile sidebar on Settings click
                  />
                  <LogoutButton />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// SidebarLink component
export const SidebarLink = ({
  link,
  className,
  onClick, // Add optional onClick prop
  ...props
}: {
  link: Links;
  className?: string;
  onClick?: () => void; // Define the prop type
  props?: LinkProps;
}) => {
  // Restore original logic using context 'open' state
  const { open, animate } = useSidebar();

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2 py-2",
        open ? "justify-start" : "justify-center", // Restore conditional justify
        className
      )}
      onClick={onClick} // Add onClick handler to the Link
      {...props}
    >
      {link.icon}
      {/* Restore motion span for label animation */}
      <motion.span
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
          width: animate ? (open ? "auto" : 0) : "auto",
        }}
        transition={{
          duration: 0.2,
          ease: "linear"
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm transition duration-150 whitespace-pre inline-block !p-0 !m-0 overflow-hidden"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};
