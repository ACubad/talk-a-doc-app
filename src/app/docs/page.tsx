'use client';

import React from 'react'; // Removed useState, useEffect
import { ExpandableDocumentCard } from '@/components/ExpandableDocumentCard'; // Import the card
import { useAppContext } from '@/components/AppLayout'; // Import the context hook
import { Loader2 } from 'lucide-react'; // Import Loader icon

// DocumentSummary type is now exported from AppLayout, no need to redefine here

export default function DocsPage() {
  // Get document state and actions from AppContext
  const {
    documents,
    isDocumentsLoading,
    documentsError,
    deleteDocument // Get the delete function
  } = useAppContext();

   return (
     <div className="container mx-auto p-4">
       <h1 className="text-2xl font-bold mb-4">My Documents</h1>
      {isDocumentsLoading && (
        <div className="flex items-center justify-center py-10 text-neutral-500">
          <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading documents...
        </div>
      )}
      {documentsError && <p className="text-red-500 py-10 text-center">Error: {documentsError}</p>}
      {!isDocumentsLoading && !documentsError && documents.length === 0 && (
        <p className="py-10 text-center text-neutral-500">No documents found.</p>
      )}
      {!isDocumentsLoading && !documentsError && documents.length > 0 && (
         <div className="py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
              {documents.map((doc) => (
                // Pass the deleteDocument function via the onDelete prop
                <ExpandableDocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={() => deleteDocument(doc.id)} // Pass delete handler
                />
              ))}
            </div>
         </div>
      )}
    </div>
  );
}
