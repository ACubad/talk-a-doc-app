'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useExpandable } from '@/hooks/use-expandable';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, ExternalLink, Download, Copy, Check } from 'lucide-react';
import type { LoadedDocumentData } from './sidebar';
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
  updated_at: string; // Use updated_at
}

interface ExpandableDocumentCardProps {
  document: DocumentSummary;
}

export function ExpandableDocumentCard({ document }: ExpandableDocumentCardProps) {
  const detailsContentRef = useRef<HTMLDivElement>(null);
  const { isExpanded, toggleExpand, animatedHeight } = useExpandable(false);
  const [fullDocumentData, setFullDocumentData] = useState<LoadedDocumentData | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Adjust animated height for the details section
  useEffect(() => {
    if (detailsContentRef.current) {
      animatedHeight.set(isExpanded ? detailsContentRef.current.offsetHeight : 0);
    } else if (!isExpanded) {
      animatedHeight.set(0);
    }
  }, [isExpanded, isContentLoading, contentError, fullDocumentData, animatedHeight]);

  const handleToggleExpand = useCallback(() => {
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

  // Prevent default focus behavior when modal opens
  const handleOpenAutoFocus = (event: Event) => {
    event.preventDefault();
  };


  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      {/* Card Part */}
      <div
        className={cn(
          "relative bg-gradient-to-b dark:from-neutral-900 from-neutral-100 dark:to-neutral-950 to-white",
          "p-6 rounded-3xl overflow-hidden border dark:border-neutral-700 border-neutral-300",
          "transition-shadow duration-200",
          isExpanded ? "shadow-lg" : "hover:shadow-md"
        )}
      >
        {/* Clickable Header */}
        <div
          className="cursor-pointer flex justify-between items-start gap-4"
          onClick={handleToggleExpand}
          role="button"
          aria-expanded={isExpanded}
          aria-controls={`details-${document.id}`}
        >
          <div>
            <p className="text-base font-bold text-neutral-800 dark:text-white relative z-20 truncate">
              {document.title || 'Untitled Document'}
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm font-normal relative z-20">
              Updated: {new Date(document.updated_at).toLocaleDateString()}
            </p>
          </div>
          <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-neutral-500 flex-shrink-0 mt-1"
          >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </motion.div>
        </div>

        {/* Expandable Details Area */}
        <motion.div
          id={`details-${document.id}`}
          style={{ height: animatedHeight }}
          className="overflow-hidden mt-4"
          initial={false}
        >
          <div ref={detailsContentRef} className="pt-4 border-t dark:border-neutral-700 border-neutral-200">
            {isContentLoading && (
              <div className="flex items-center justify-center p-4 text-sm text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading details...
              </div>
            )}
            {contentError && (
              <div className="flex items-center p-4 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-md">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" /> Error: {contentError}
              </div>
            )}
            {fullDocumentData && !isContentLoading && !contentError && (
              <div className="space-y-4">
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
             {!isContentLoading && !contentError && !fullDocumentData && isExpanded && (
               <div className="p-4 text-sm text-neutral-500">Expand to load details.</div>
             )}
          </div>
        </motion.div>
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
         <DialogFooter className="px-6 py-4 border-t bg-background sm:justify-end flex-shrink-0 sm:rounded-b-lg space-x-2">
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
