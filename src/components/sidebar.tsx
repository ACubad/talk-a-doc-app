"use client";

import { cn } from "../lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, useEffect, useCallback, FC, useRef } from "react"; // Added useRef
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  Loader2,
  X,
  FilePenLine,
  Search,
  FolderKanban,
  Settings,
  LogOut,
  MoreHorizontal, // Added for dropdown trigger
  Edit3, // Added for Rename action
  Trash2, // Added for Delete action
  Pin, // Added for Pin action
  PinOff, // Added for Unpin action
} from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";
import LogoutButton from "./LogoutButton";
import { Button } from "./ui/button";
import { Input } from "./ui/input"; // Added for inline rename
import { useAppContext, DocumentSummary } from "./AppLayout"; // Import App context hook and DocumentSummary type
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Added DropdownMenu components
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage, // Not strictly needed here but imported by component
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"; // Added Breadcrumb components
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"; // Added Drawer components
import { useMediaQuery } from "@/hooks/use-media-query"; // Added useMediaQuery hook
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ProfileEditDialogContent } from "@/components/ProfileEditDialog";

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

// SidebarBody component - Now the main entry point, uses AppContext directly
export const SidebarBody = () => {
  // State for controlling sidebar open/closed (for hover effect on desktop)
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  // State for controlling mobile sidebar open/closed
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Get necessary state and functions from AppContext
  // handleLoadDocument is needed here to pass down
  const { handleLoadDocument } = useAppContext();

  return (
    <>
      {/* Pass state and setters down */}
      <DesktopSidebar
        isHoverOpen={isHoverOpen}
        setIsHoverOpen={setIsHoverOpen}
        onLoadDocument={handleLoadDocument} // Pass load handler
      />
      <MobileSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLoadDocument={handleLoadDocument} // Pass load handler
      />
    </>
  );
};

// Define props for DesktopSidebar
interface DesktopSidebarProps extends React.ComponentProps<typeof motion.div> {
    isHoverOpen: boolean;
    setIsHoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onLoadDocument: (data: LoadedDocumentData) => void; // Receive load handler
}

// DesktopSidebar component
export const DesktopSidebar: FC<DesktopSidebarProps> = ({
  className,
  isHoverOpen,
  setIsHoverOpen,
  onLoadDocument, // Receive load handler
  ...props
}) => {
  // Get state and actions from AppContext
  const {
    handleNewDocument,
    username,
    avatarUrl,
    documents, // Use documents from context
    isDocumentsLoading, // Use loading state from context
    documentsError, // Use error state from context
    deleteDocument, // Use delete action from context
    renameDocument, // Use rename action from context
    pinDocument, // Use pin action from context
  } = useAppContext();

  const router = useRouter();
  const [isLoadingDoc, setIsLoadingDoc] = useState<string | null>(null); // Keep local loading state for individual doc load click
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null); // State to track which doc is being renamed
  const [renameValue, setRenameValue] = useState(''); // State for the rename input value
  const renameInputRef = useRef<HTMLInputElement>(null); // Ref for the rename input

  // Handle loading document logic (uses onLoadDocument prop)
  const handleLoadDocumentClick = async (documentId: string) => {
    if (!onLoadDocument) return; // Ensure the handler is passed
    setIsLoadingDoc(documentId);
    // Error state is handled globally in AppContext now
    try {
      const response = await fetch(`/api/documents/load/${documentId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error JSON' }));
        throw new Error(errorData.error || `Failed to load document: ${response.status}`);
      }
      const data: LoadedDocumentData = await response.json();
      onLoadDocument(data); // Call the passed-in handler from AppLayout
      router.push('/'); // Navigate to main page after loading
    } catch (error) {
      console.error(`Error loading document ${documentId}:`, error);
      // Display error through global state (AppContext already sets documentsError)
    } finally {
      setIsLoadingDoc(null);
    }
  };

  // Start renaming
  const handleStartRename = (doc: DocumentSummary) => {
    setRenamingDocId(doc.id);
    setRenameValue(doc.title);
    // Focus the input after a short delay to allow it to render
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  // Cancel renaming
  const handleCancelRename = () => {
    setRenamingDocId(null);
    setRenameValue('');
  };

  // Submit rename
  const handleRenameSubmit = async (docId: string) => {
    const currentDoc = documents.find(d => d.id === docId);
    if (!renameValue.trim() || renameValue.trim() === currentDoc?.title) {
      handleCancelRename(); // Cancel if name is empty, unchanged, or just whitespace
      return;
    }
    await renameDocument(docId, renameValue.trim()); // Call context action
    handleCancelRename(); // Reset renaming state
  };

  // Handle Enter key press in rename input
  const handleRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, docId: string) => {
    if (event.key === 'Enter') {
      handleRenameSubmit(docId);
    } else if (event.key === 'Escape') {
      handleCancelRename();
    }
  };


  // Conditional styles based on hover state
  const open = isHoverOpen; // Use isHoverOpen for conditional rendering/styling
  const setOpen = setIsHoverOpen; // Use setIsHoverOpen for hover handlers
  const animate = true; // Keep animation enabled
  const paddingX = open ? "px-4" : "px-3";
  const alignItems = !open ? "items-center" : "";

  // JSX structure
  return (
    <motion.div
      className={cn(
        "h-full py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[300px] flex-shrink-0 overflow-hidden",
        paddingX,
        alignItems,
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      <div className={cn("flex flex-col h-full", !open ? "p-3" : "p-4")}>
        {/* Top Static Section */}
        <div>
          <SidebarLink
            link={{
              label: "New Document",
              href: "/",
              icon: <FilePenLine className="w-4 h-4" />,
            }}
            onClick={handleNewDocument}
            isOpen={open} // Pass open state
            animate={animate} // Pass animate state
          />
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
            isOpen={open} // Pass open state
            animate={animate} // Pass animate state
          />
        </div>

        {/* Middle Scrollable History Section - Use AppContext state */}
        {open && (
          <ScrollArea className="flex-grow my-4 border-t border-b border-neutral-200 dark:border-neutral-700">
            <div className="p-2 space-y-1"> {/* Add space-y-1 for spacing between items */}
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2 px-2">History</h3>
              {isDocumentsLoading && (
                <div className="flex items-center justify-center p-2 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                </div>
              )}
              {documentsError && (
                <div className="p-2 text-sm text-red-600 dark:text-red-400">Error: {documentsError}</div>
              )}
              {!isDocumentsLoading && !documentsError && documents.length === 0 && (
                 <div className="p-2 text-sm text-neutral-500">No saved documents found.</div>
              )}
              {/* Map through documents from AppContext */}
              {!isDocumentsLoading && !documentsError && documents.map(doc => (
                 <Breadcrumb key={doc.id} className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 group">
                   <BreadcrumbList className="items-center">
                     <BreadcrumbItem className="flex-grow min-w-0"> {/* Allow item to grow and shrink */}
                       {renamingDocId === doc.id ? (
                         // Inline Rename Input
                         <Input
                           ref={renameInputRef}
                           type="text"
                           value={renameValue}
                           onChange={(e) => setRenameValue(e.target.value)}
                           onKeyDown={(e) => handleRenameKeyDown(e, doc.id)}
                           onBlur={() => handleRenameSubmit(doc.id)} // Save on blur as well
                           className="h-auto py-1 px-1 text-sm font-normal text-neutral-700 dark:text-neutral-300 bg-transparent border border-blue-500 focus:outline-none focus:ring-0 w-full"
                         />
                       ) : (
                         // Document Title Link (loads doc) - Use Button styled as link
                         <Button
                           variant="link" // Use link variant for styling
                           className="h-auto p-0 m-0 font-normal text-sm text-neutral-700 dark:text-neutral-300 flex items-center w-full justify-start text-left truncate" // Ensure it looks like text
                           onClick={() => handleLoadDocumentClick(doc.id)}
                           disabled={isLoadingDoc === doc.id}
                           title={doc.title || 'Untitled Document'}
                         >
                           {isLoadingDoc === doc.id ? (
                             <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0" />
                           ) : (
                             doc.pinned && <Pin className="h-3 w-3 mr-1.5 text-blue-500 flex-shrink-0" />
                           )}
                           <span className="truncate">{doc.title || 'Untitled Document'}</span>
                         </Button>
                       )}
                     </BreadcrumbItem>
                     {/* Actions Dropdown (only shown if not renaming) */}
                     {renamingDocId !== doc.id && (
                       <BreadcrumbItem className="flex-shrink-0">
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100" // Show on hover/focus
                               aria-label="Document actions"
                             >
                               <BreadcrumbEllipsis className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="w-40">
                             <DropdownMenuItem onSelect={() => handleStartRename(doc)}>
                               <Edit3 className="mr-2 h-4 w-4" />
                               <span>Rename</span>
                             </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => pinDocument(doc.id)}>
                               {doc.pinned ? (
                                 <PinOff className="mr-2 h-4 w-4" />
                               ) : (
                                 <Pin className="mr-2 h-4 w-4" />
                               )}
                               <span>{doc.pinned ? 'Unpin' : 'Pin'}</span>
                             </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => deleteDocument(doc.id)} className="text-red-600 focus:text-red-600 dark:focus:text-red-400">
                               <Trash2 className="mr-2 h-4 w-4" />
                               <span>Delete</span>
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </BreadcrumbItem>
                     )}
                   </BreadcrumbList>
                 </Breadcrumb>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Bottom Static Section */}
        <div className="mt-auto">
          {/* User Profile Section with Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username || 'User Avatar'} className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
                ) : (
                  <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full flex-shrink-0"></div>
                )}
                {open && (
                  <span className="text-sm text-neutral-700 dark:text-neutral-200 truncate">
                    {username || 'User'}
                  </span>
                )}
              </div>
            </DialogTrigger>
            <ProfileEditDialogContent />
          </Dialog>
          <SidebarLink
            link={{
              label: "Settings",
              href: "/settings",
              icon: <Settings className="w-4 h-4" />,
            }}
            isOpen={open} // Pass open state
            animate={animate} // Pass animate state
          />
          <LogoutButton open={open} />
        </div>
      </div>
    </motion.div>
  );
};

// Define props for MobileSidebar
interface MobileSidebarProps extends React.ComponentProps<"div"> {
    isMobileOpen: boolean;
    setIsMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onLoadDocument: (data: LoadedDocumentData) => void; // Receive load handler
}

// MobileSidebar component
export const MobileSidebar: FC<MobileSidebarProps> = ({
  className,
  isMobileOpen,
  setIsMobileOpen,
  onLoadDocument, // Receive load handler
  ...props
}) => {
  // Get state and actions from AppContext
  const {
    handleNewDocument,
    username,
    avatarUrl,
    openProfileDialog,
    documents, // Use documents from context
    isDocumentsLoading, // Use loading state from context
    documentsError, // Use error state from context
    deleteDocument, // Use delete action from context
    renameDocument, // Use rename action from context
    pinDocument, // Use pin action from context
  } = useAppContext();

  const router = useRouter();
  const [isLoadingDoc, setIsLoadingDoc] = useState<string | null>(null); // Keep local loading state
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null); // State for renaming
  const [renameValue, setRenameValue] = useState(''); // State for rename input
  const renameInputRef = useRef<HTMLInputElement>(null); // Ref for rename input
  const isDesktop = useMediaQuery("(min-width: 768px)"); // Check screen size
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false); // State for Drawer/Dropdown

  // Handle loading document logic (uses onLoadDocument prop)
  const handleLoadDocumentClick = async (documentId: string) => {
    if (!onLoadDocument) return; // Ensure handler exists
    setIsLoadingDoc(documentId);
    try {
      const response = await fetch(`/api/documents/load/${documentId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error JSON' }));
        throw new Error(errorData.error || `Failed to load document: ${response.status}`);
      }
      const data: LoadedDocumentData = await response.json();
      onLoadDocument(data); // Call the passed-in handler
      router.push('/'); // Navigate to main page
      setIsMobileOpen(false); // Close mobile sidebar
    } catch (error) {
      console.error(`Error loading document ${documentId}:`, error);
      // Error handled globally
    } finally {
      setIsLoadingDoc(null);
    }
  };

   // Start renaming (Mobile)
   const handleStartRename = (doc: DocumentSummary) => {
    setIsActionMenuOpen(false); // Close drawer/dropdown first
    setRenamingDocId(doc.id);
    setRenameValue(doc.title);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  // Cancel renaming (Mobile)
  const handleCancelRename = () => {
    setRenamingDocId(null);
    setRenameValue('');
  };

  // Submit rename (Mobile)
  const handleRenameSubmit = async (docId: string) => {
     const currentDoc = documents.find(d => d.id === docId);
    if (!renameValue.trim() || renameValue.trim() === currentDoc?.title) {
      handleCancelRename();
      return;
    }
    await renameDocument(docId, renameValue.trim());
    handleCancelRename();
  };

  // Handle Enter key press in rename input (Mobile)
  const handleRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, docId: string) => {
    if (event.key === 'Enter') {
      handleRenameSubmit(docId);
    } else if (event.key === 'Escape') {
      handleCancelRename();
    }
  };

  // Action handler for mobile drawer/dropdown items
  const handleMobileAction = (action: () => void) => {
    setIsActionMenuOpen(false); // Close drawer/dropdown
    action(); // Execute the action (rename, pin, delete)
  };


  // JSX structure
  return (
    <>
      {/* Mobile Header */}
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-start bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
        {...props}
      >
        <Menu
          className="text-neutral-800 dark:text-neutral-200 cursor-pointer z-20"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        />
        <AnimatePresence>
          {isMobileOpen && (
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
                onClick={() => setIsMobileOpen(!isMobileOpen)}
              >
                <X />
              </div>
              <div className="flex flex-col h-full pt-10">
                {/* Top Static Section */}
                <div>
                  <SidebarLink
                    link={{
                      label: "New Document",
                      href: "/",
                      icon: <FilePenLine className="w-4 h-4" />,
                    }}
                    onClick={() => {
                      handleNewDocument();
                      setIsMobileOpen(false);
                    }}
                    isOpen={true} // Always open in mobile view
                    animate={false} // No animation needed here
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
                    onClick={() => setIsMobileOpen(false)}
                    isOpen={true} // Always open in mobile view
                    animate={false} // No animation needed here
                  />
                </div>

                {/* Middle Scrollable History Section - Mobile - Use AppContext state */}
                <ScrollArea className="flex-grow my-4 border-t border-b border-neutral-200 dark:border-neutral-700">
                  <div className="p-2 space-y-1"> {/* Add spacing */}
                    <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2 px-2">History</h3>
                    {isDocumentsLoading && (
                      <div className="flex items-center justify-center p-2 text-sm text-neutral-500">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                      </div>
                    )}
                    {documentsError && (
                      <div className="p-2 text-sm text-red-600 dark:text-red-400">Error: {documentsError}</div>
                    )}
                    {!isDocumentsLoading && !documentsError && documents.length === 0 && (
                       <div className="p-2 text-sm text-neutral-500">No saved documents found.</div>
                    )}
                    {/* Map through documents from AppContext */}
                    {!isDocumentsLoading && !documentsError && documents.map(doc => (
                       <Breadcrumb key={doc.id} className="p-1 rounded group"> {/* Remove hover bg for mobile? */}
                         <BreadcrumbList className="items-center">
                           <BreadcrumbItem className="flex-grow min-w-0">
                             {renamingDocId === doc.id ? (
                               // Inline Rename Input (Mobile)
                               <Input
                                 ref={renameInputRef}
                                 type="text"
                                 value={renameValue}
                                 onChange={(e) => setRenameValue(e.target.value)}
                                 onKeyDown={(e) => handleRenameKeyDown(e, doc.id)}
                                 onBlur={() => handleRenameSubmit(doc.id)}
                                 className="h-auto py-1 px-1 text-sm font-normal text-neutral-700 dark:text-neutral-300 bg-transparent border border-blue-500 focus:outline-none focus:ring-0 w-full"
                               />
                             ) : (
                               // Document Title Button (Mobile)
                               <Button
                                 variant="link"
                                 className="h-auto p-0 m-0 font-normal text-sm text-neutral-700 dark:text-neutral-300 flex items-center w-full justify-start text-left truncate"
                                 onClick={() => handleLoadDocumentClick(doc.id)}
                                 disabled={isLoadingDoc === doc.id}
                                 title={doc.title || 'Untitled Document'}
                               >
                                 {isLoadingDoc === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0" />
                                  ) : (
                                    doc.pinned && <Pin className="h-3 w-3 mr-1.5 text-blue-500 flex-shrink-0" />
                                  )}
                                 <span className="truncate">{doc.title || 'Untitled Document'}</span>
                               </Button>
                             )}
                           </BreadcrumbItem>
                           {/* Actions Drawer/Dropdown (Mobile - only shown if not renaming) */}
                           {renamingDocId !== doc.id && (
                             <BreadcrumbItem className="flex-shrink-0">
                               {isDesktop ? ( // Use Drawer on mobile
                                 <DropdownMenu open={isActionMenuOpen} onOpenChange={setIsActionMenuOpen}>
                                   <DropdownMenuTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Document actions">
                                       <BreadcrumbEllipsis className="h-4 w-4" />
                                     </Button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent align="end" className="w-40">
                                     <DropdownMenuItem onSelect={() => handleMobileAction(() => handleStartRename(doc))}>
                                       <Edit3 className="mr-2 h-4 w-4" /><span>Rename</span>
                                     </DropdownMenuItem>
                                     <DropdownMenuItem onSelect={() => handleMobileAction(() => pinDocument(doc.id))}>
                                       {doc.pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                                       <span>{doc.pinned ? 'Unpin' : 'Pin'}</span>
                                     </DropdownMenuItem>
                                     <DropdownMenuItem onSelect={() => handleMobileAction(() => deleteDocument(doc.id))} className="text-red-600 focus:text-red-600 dark:focus:text-red-400">
                                       <Trash2 className="mr-2 h-4 w-4" /><span>Delete</span>
                                     </DropdownMenuItem>
                                   </DropdownMenuContent>
                                 </DropdownMenu>
                               ) : (
                                 <Drawer open={isActionMenuOpen} onOpenChange={setIsActionMenuOpen}>
                                   <DrawerTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Document actions">
                                       <BreadcrumbEllipsis className="h-4 w-4" />
                                     </Button>
                                   </DrawerTrigger>
                                   <DrawerContent>
                                     <DrawerHeader className="text-left">
                                       <DrawerTitle>Actions for: {doc.title || 'Untitled Document'}</DrawerTitle>
                                       {/* <DrawerDescription>Select an action.</DrawerDescription> */}
                                     </DrawerHeader>
                                     <div className="grid gap-1 px-4">
                                        <Button variant="ghost" className="justify-start" onClick={() => handleMobileAction(() => handleStartRename(doc))}>
                                            <Edit3 className="mr-2 h-4 w-4" /><span>Rename</span>
                                        </Button>
                                        <Button variant="ghost" className="justify-start" onClick={() => handleMobileAction(() => pinDocument(doc.id))}>
                                            {doc.pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                                            <span>{doc.pinned ? 'Unpin' : 'Pin'}</span>
                                        </Button>
                                        <Button variant="ghost" className="justify-start text-red-600 hover:text-red-600" onClick={() => handleMobileAction(() => deleteDocument(doc.id))}>
                                            <Trash2 className="mr-2 h-4 w-4" /><span>Delete</span>
                                        </Button>
                                     </div>
                                     <DrawerFooter className="pt-4">
                                       <DrawerClose asChild>
                                         <Button variant="outline">Cancel</Button>
                                       </DrawerClose>
                                     </DrawerFooter>
                                   </DrawerContent>
                                 </Drawer>
                               )}
                             </BreadcrumbItem>
                           )}
                         </BreadcrumbList>
                       </Breadcrumb>
                    ))}
                  </div>
                </ScrollArea>

                {/* Bottom Static Section */}
                <div className="mt-auto pb-4">
                  <div
                    className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                    onClick={() => {
                      openProfileDialog();
                      setIsMobileOpen(false); // Close mobile sidebar when opening profile
                    }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username || 'User Avatar'} className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
                    ) : (
                      <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full flex-shrink-0"></div>
                    )}
                    <span className="text-sm text-neutral-700 dark:text-neutral-200 truncate">
                      {username || 'User'}
                    </span>
                  </div>
                  <SidebarLink
                    link={{
                      label: "Settings",
                      href: "/settings",
                      icon: <Settings className="w-4 h-4" />,
                    }}
                    onClick={() => setIsMobileOpen(false)} // Close mobile sidebar on Settings click
                    isOpen={true} // Always open in mobile view
                    animate={false} // No animation needed here
                  />
                  <LogoutButton open={true} /> {/* Pass true as open state for mobile */}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// SidebarLink component - Updated props
export const SidebarLink = ({
  link,
  className,
  onClick,
  isOpen, // Receive open state
  animate, // Receive animate state
  ...props
}: {
  link: Links;
  className?: string;
  onClick?: () => void;
  isOpen: boolean; // Add prop type
  animate: boolean; // Add prop type
  props?: LinkProps;
}) => {
  // Use passed-in state instead of context
  const open = isOpen;

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2 py-2",
        open ? "justify-start" : "justify-center",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          // Use passed-in state for animation
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
