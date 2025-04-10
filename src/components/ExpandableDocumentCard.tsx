'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useExpandable } from '@/hooks/use-expandable';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, ExternalLink, Download, Copy, Check, Trash2 } from 'lucide-react'; // Added Trash2 icon
import type { LoadedDocumentData } from './sidebar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Added AlertDialog components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay,
} from "@/components/ui/dialog";
// Tooltip components are already imported, no change needed here.
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Corrected interface to match API data
interface DocumentSummary {
  id: string;
  title: string;      // Use title
  updated_at: string;
}

interface ExpandableDocumentCardProps {
  document: DocumentSummary;
  onActionSuccess: () => Promise<void>; // Add prop for callback after successful action (like delete)
}

export function ExpandableDocumentCard({ document, onActionSuccess }: ExpandableDocumentCardProps) {
  const detailsContentRef = useRef<HTMLDivElement>(null);
  const { isExpanded, toggleExpand } = useExpandable(false);
  const [fullDocumentData, setFullDocumentData] = useState<LoadedDocumentData | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // State for delete operation

  // Fetch full document content when expanded
  useEffect(() => {
    async function fetchFullDocument() {
      if (isExpanded && !fullDocumentData && !isContentLoading && !contentError) {
        setIsContentLoading(true);
        setContentError(null);
        try {
          const response = await fetch(`/api/documents/load/${document.id}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error JSON' }));
            throw new Error(errorData.error || `Failed to load document: ${response.status}`);
          }
          const data: LoadedDocumentData = await response.json();
          setFullDocumentData(data);
        } catch (error) {
          console.error(`[${document.id}] Error loading document:`, error);
          setContentError(error instanceof Error ? error.message : "Unknown error loading document");
          setFullDocumentData(null);
        } finally {
          setIsContentLoading(false);
        }
      }
    }

    fetchFullDocument();
  }, [isExpanded, document.id, fullDocumentData, isContentLoading, contentError]);

  // REMOVE useEffect for animatedHeight calculation

  const handleToggleExpand = useCallback(() => {
    toggleExpand(); // Use toggleExpand from the hook
  }, [toggleExpand]);

  // Handle Copy Action
  const handleCopy = useCallback(async () => {
    if (!fullDocumentData?.generated_content) return;
    try {
      const tempDiv = window.document.createElement('div');
      tempDiv.innerHTML = fullDocumentData.generated_content;
      const textToCopy = tempDiv.textContent || tempDiv.innerText || "";
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, [fullDocumentData]);

  // Handle Download Action
  const handleDownload = useCallback(async () => {
    if (!fullDocumentData) return;
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: fullDocumentData.generated_content,
          format: 'DOCX',
          docType: fullDocumentData.document_type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed: Could not parse error response' }));
        throw new Error(errorData.error || `Download failed: ${response.status}`);
      }

      const disposition = response.headers.get('content-disposition');
      let filename = 'download.docx';
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = filename;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  }, [fullDocumentData]);

  // Prevent default focus behavior when modal opens
  const handleOpenAutoFocus = (event: Event) => {
    event.preventDefault();
  };

  // Handle Delete Action
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/delete/${document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Attempt to parse error, provide fallback
        const errorData = await response.json().catch(() => ({ error: `Deletion failed: ${response.status}` }));
        throw new Error(errorData.error || `Deletion failed: ${response.status}`);
      }

      console.log(`Document ${document.id} deleted successfully.`);
      // Call the callback to refresh the list in the parent component
      await onActionSuccess();
      // Note: The card will disappear because the parent re-renders the list without this item.
      // No need to manually hide the card here.

    } catch (error) {
      console.error(`[${document.id}] Error deleting document:`, error);
      // Display error to user (e.g., using a toast notification library)
      alert(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      // Close the alert dialog if needed, though it might close automatically on action click
    }
  }, [document.id, onActionSuccess]);


  return (
    <AlertDialog> {/* Wrap card content potentially triggering delete */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        {/* Card Part */}
      <div
        className={cn(
          "relative bg-gradient-to-b dark:from-neutral-900 from-neutral-100 dark:to-neutral-950 to-white",
          "p-6 rounded-3xl overflow-hidden border dark:border-neutral-700 border-neutral-300",
          "transition-shadow duration-200",
          "flex flex-col", // Always flex-col
          "h-[280px]", // Set fixed height (adjust value as needed) - Changed from min-h
          isExpanded ? "justify-start shadow-lg" : "justify-center items-center hover:shadow-md" // Conditional centering/alignment
        )}
      >
        {/* Clickable Header */}
        <div
          className={cn(
            "cursor-pointer flex justify-between items-start gap-4 w-full" // Ensure header takes full width
          )}
          onClick={handleToggleExpand}
          role="button"
          aria-expanded={isExpanded}
          aria-controls={`details-${document.id}`}
        >
          {/* Wrap title in Tooltip */}
          {/* Added conditional text-center for collapsed state */}
          <div className={cn("flex-grow overflow-hidden mr-2", !isExpanded && "text-center")}>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Conditionally apply truncate class */}
                  <p className={cn(
                    "text-base font-bold text-neutral-800 dark:text-white relative z-20",
                    isExpanded && "truncate" // Apply truncate only when expanded
                  )}>
                    {document.title || 'Untitled Document'}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  {/* Show full title in tooltip */}
                  <p>{document.title || 'Untitled Document'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm font-normal relative z-20">
              Updated: {new Date(document.updated_at).toLocaleDateString()}
            </p>
          </div>

          {/* Delete Icon Button - Conditionally Rendered before the chevron */}
          {isExpanded && (
            <AlertDialogTrigger asChild>
              {/* Stop propagation to prevent card collapse when clicking delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 flex-shrink-0" // Added flex-shrink-0
                onClick={(e) => e.stopPropagation()}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </AlertDialogTrigger>
          )}

          {/* Collapse/Expand Icon */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-neutral-500 flex-shrink-0 mt-1" // Kept flex-shrink-0
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </motion.div>
        </div>

        {/* Apply margin conditionally outside the motion div */}
        {isExpanded && <div className="mt-4 w-full"> 
          {/* Expandable Details Area - Using Variants */}
          <motion.div
            id={`details-${document.id}`}
            initial="hidden"
            animate={isExpanded ? "visible" : "hidden"}
            variants={{
              // Removed marginTop from variants
              hidden: { opacity: 0, height: 0, borderTopWidth: 0, paddingTop: 0, transition: { duration: 0.3 } },
              visible: { opacity: 1, height: 'auto', borderTopWidth: 1, paddingTop: '1rem', transition: { duration: 0.3 } }
            }}
            className="overflow-hidden w-full dark:border-neutral-700 border-neutral-200 border-t" // Apply border styles directly
          >
          {/* Content inside the animated container */}
          <div ref={detailsContentRef}>
            {isContentLoading && (
              <div className="flex items-center justify-center pb-4 text-sm text-neutral-500"> {/* Adjusted padding */}
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading details...
              </div>
            )}
            {contentError && (
              <div className="flex items-center pb-4 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-md"> {/* Adjusted padding */}
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" /> Error: {contentError}
              </div>
            )}
            {fullDocumentData && !isContentLoading && !contentError && (
              <div className="space-y-4"> {/* Details content */}
                <div className="text-sm">
                  <h4 className="font-semibold mb-2">Document Details</h4>
                  <p><strong>Type:</strong> {fullDocumentData.document_type}</p>
                  <p><strong>Input Language:</strong> {fullDocumentData.input_language}</p>
                  <p><strong>Output Language:</strong> {fullDocumentData.output_language}</p>
                  <p><strong>Output Format:</strong> {fullDocumentData.output_format}</p>
                 </div>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Full Document
                  </Button>
                </DialogTrigger>
              </div>
            )}
            </div>
          </motion.div>
        </div>}
      </div>

      {/* Modal Content (for viewing full document) */}
      <DialogContent
        className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] h-[80vh] flex flex-col p-0 gap-0"
        onOpenAutoFocus={handleOpenAutoFocus} // Prevent auto-focus
      >
         {/* Header */}
         <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
           <DialogTitle>{fullDocumentData?.title || 'Document Content'}</DialogTitle>
         </DialogHeader>
         {/* Scrollable Content Area */}
         <div className="flex-grow overflow-y-auto">
           <div
             className="max-w-none whitespace-pre-wrap text-sm text-foreground px-6 py-4"
             dangerouslySetInnerHTML={{ __html: fullDocumentData?.generated_content || 'No content available.' }}
           />
         </div>
         {/* Footer - Standard tooltip implementation */}
         <DialogFooter className="flex flex-row justify-end px-6 py-4 border-t bg-background flex-shrink-0 sm:rounded-b-lg space-x-2">
           <TooltipProvider delayDuration={100}>
             {/* Download Button Tooltip */}
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button variant="outline" size="icon" onClick={handleDownload} disabled={!fullDocumentData || isDownloading}>
                   {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                 </Button>
               </TooltipTrigger>
               <TooltipContent>
                 <p>Download</p>
               </TooltipContent>
             </Tooltip>
             {/* Copy Button Tooltip */}
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button variant="outline" size="icon" onClick={handleCopy} disabled={!fullDocumentData?.generated_content}>
                   {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                 </Button>
               </TooltipTrigger>
               <TooltipContent>
                 <p>{isCopied ? 'Copied!' : 'Copy'}</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
         </DialogFooter>
       </DialogContent>
      </Dialog>

      {/* Alert Dialog Content (for delete confirmation) */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the document
            "{document.title || 'Untitled Document'}" and remove its data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
