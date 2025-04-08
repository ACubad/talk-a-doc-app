"use client";

import { cn } from "../lib/utils"; // Corrected import path
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext, useEffect, useCallback, FC } from "react"; // Added FC
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  Loader2, // Added Loader icon
  X,
  FilePenLine,
  Search,
  FolderKanban,
  Settings,
  LogOut,
} from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";
import LogoutButton from "./LogoutButton";
import { Button } from "./ui/button"; // Import Button for history items

// Define types for history items and loaded documents
interface HistoryItem {
  id: string;
  title: string;
  updated_at: string;
}

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
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState<string | null>(null);

  // Fetch history logic (remains the same)
  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch('/api/documents/list');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch history: ${response.status}`);
      }
      const data: HistoryItem[] = await response.json();
      setHistoryItems(data);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistoryError(error instanceof Error ? error.message : "Unknown error fetching history");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle loading document logic (remains the same, uses onLoadDocument from context)
  const handleLoadDocument = async (documentId: string) => {
    if (!onLoadDocument) return;
    setIsLoadingDoc(documentId);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/documents/load/${documentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to load document: ${response.status}`);
      }
      const data: LoadedDocumentData = await response.json();
      onLoadDocument(data);
    } catch (error) {
      console.error(`Error loading document ${documentId}:`, error);
      setHistoryError(error instanceof Error ? error.message : "Unknown error loading document");
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
        "h-full py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[300px] flex-shrink-0 overflow-hidden",
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
          <SidebarLink
            link={{
              label: "New Document",
              href: "/",
              icon: <FilePenLine className="w-4 h-4" />,
            }}
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
        {open && (
          <ScrollArea className="flex-grow my-4 border-t border-b border-neutral-200 dark:border-neutral-700">
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
              {!isHistoryLoading && !historyError && historyItems.map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start text-sm py-1 px-2 h-auto font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  onClick={() => handleLoadDocument(item.id)}
                  disabled={isLoadingDoc === item.id}
                >
                  {isLoadingDoc === item.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {item.title || 'Untitled Document'}
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Bottom Static Section */}
        <div className="mt-auto">
          {/* Restore conditional rendering for user name */}
          <div className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer">
            <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full flex-shrink-0"></div> {/* Profile Placeholder */}
            {open && (
              <span className="text-sm text-neutral-700 dark:text-neutral-200">User Name</span>
            )}
          </div>
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
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState<string | null>(null);

  // Fetch history logic (remains the same)
  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch('/api/documents/list');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch history: ${response.status}`);
      }
      const data: HistoryItem[] = await response.json();
      setHistoryItems(data);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistoryError(error instanceof Error ? error.message : "Unknown error fetching history");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle loading document logic (remains the same, uses onLoadDocument from context)
  const handleLoadDocument = async (documentId: string) => {
    if (!onLoadDocument) return;
    setIsLoadingDoc(documentId);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/documents/load/${documentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to load document: ${response.status}`);
      }
      const data: LoadedDocumentData = await response.json();
      onLoadDocument(data);
      setOpen(false); // Close mobile sidebar after loading
    } catch (error) {
      console.error(`Error loading document ${documentId}:`, error);
      setHistoryError(error instanceof Error ? error.message : "Unknown error loading document");
    } finally {
      setIsLoadingDoc(null);
    }
  };

  // JSX structure (remains the same)
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-neutral-800 dark:text-neutral-200 cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
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
                  <SidebarLink
                    link={{
                      label: "New Document",
                      href: "/",
                      icon: <FilePenLine className="w-4 h-4" />,
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
                  />
                </div>

                {/* Middle Scrollable History Section - Mobile */}
                <ScrollArea className="flex-grow my-4 border-t border-b border-neutral-200 dark:border-neutral-700">
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
                    {!isHistoryLoading && !historyError && historyItems.map(item => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className="w-full justify-start text-sm py-1 px-2 h-auto font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        onClick={() => handleLoadDocument(item.id)}
                        disabled={isLoadingDoc === item.id}
                      >
                        {isLoadingDoc === item.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {item.title || 'Untitled Document'}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>

                {/* Bottom Static Section */}
                <div className="mt-auto pb-4">
                   <div className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer">
                     <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full flex-shrink-0"></div>
                     <span className="text-sm text-neutral-700 dark:text-neutral-200">User Name</span>
                   </div>
                  <SidebarLink
                    link={{
                      label: "Settings",
                      href: "/settings",
                      icon: <Settings className="w-4 h-4" />,
                    }}
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

// SidebarLink component (remains the same)
export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
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
