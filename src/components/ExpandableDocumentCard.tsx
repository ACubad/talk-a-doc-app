'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useExpandable } from '@/hooks/use-expandable';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, ExternalLink, Download, Copy, Check, Trash2 } from 'lucide-react'; // Added Trash2 icon
import type { DocumentSummary } from './AppLayout'; // Import DocumentSummary from AppLayout
import type { LoadedDocumentData } from './sidebar'; // Import LoadedDocumentData from sidebar
import { Button } from '@/components/ui/button';
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

// Use DocumentSummary from AppLayout
interface ExpandableDocumentCardProps {
  document: DocumentSummary;
  onDelete: () => Promise<void>; // Add onDelete prop
}

export function ExpandableDocumentCard({ document, onDelete }: ExpandableDocumentCardProps) { // Destructure onDelete
  const detailsContentRef = useRef<HTMLDivElement>(null);
  const { isExpanded, toggleExpand } = useExpandable(false);
  const [fullDocumentData, setFullDocumentData] = useState<LoadedDocumentData | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // State for delete loading indicator

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


  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    // Prevent toggle if delete button is clicked
    if ((e.target as HTMLElement).closest('.delete-button')) {
      return;
    }
    toggleExpand();
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

  // Handle Delete Action
  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion when clicking delete
    setIsDeleting(true);
    try {
      await onDelete(); // Call the passed-in delete function (which includes confirmation)
      // No need to update local state here, AppContext handles it
    } catch (error) {
      console.error("Error during delete operation:", error);
      // Error state is handled in AppContext, but could show local feedback too
    } finally {
      // Only set isDeleting to false if the component is still mounted
      // (It might unmount immediately if deletion is successful)
      // A slight delay can help visually, or rely on parent state update
      // setIsDeleting(false); // Re-enable button if deletion fails and component remains
    }
  }, [onDelete]);


  // Prevent default focus behavior when modal opens
  const handleOpenAutoFocus = (event: Event) => {
    event.preventDefault();
  };


  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      {/* Card Part */}
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
          {/* Title and Date Section */}
          <div className={cn("flex-grow overflow-hidden", !isExpanded && "text-center")}>
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
                  <p>{document.title || 'Untitled Document'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm font-normal relative z-20">
              Updated: {new Date(document.updated_at).toLocaleDateString()}
            </p>
          </div>

          {/* Controls Section (Delete Button and Expander) */}
          <div className="flex items-start flex-shrink-0 space-x-2 ml-2">
             {/* Delete Button - Conditionally render based on isExpanded */}
             {isExpanded && (
               <TooltipProvider delayDuration={100}>
                 <Tooltip>
                   <TooltipTrigger asChild>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6 text-neutral-500 hover:text-red-500 dark:hover:text-red-400 delete-button" // Added delete-button class
                     onClick={handleDelete}
                     disabled={isDeleting}
                     aria-label="Delete document"
                   >
                     {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Delete</p>
                   </TooltipContent>
                 </Tooltip>
               </TooltipProvider>
             )}

             {/* Expander Arrow */}
             <motion.div
                 animate={{ rotate: isExpanded ? 180 : 0 }}
                 transition={{ duration: 0.2 }}
                 className="text-neutral-500 mt-1" // Adjusted margin slightly
             >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
             </motion.div>
          </div>
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
               {/* Removed the "Expand to load details" message as loading handles this */}
            </div>
          </motion.div>
        </div>} 
      </div>

      {/* Modal Content */}
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
  );
}
