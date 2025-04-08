'use client';

import React, { useState, useEffect } from 'react';
import { ExpandableDocumentCard } from '@/components/ExpandableDocumentCard'; // Import the new card

 // Renamed interface for clarity, matches card input
 interface DocumentSummary {
   id: string;
   title: string;      // Use title from API
   updated_at: string; // Use updated_at from API
 }

export default function DocsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]); // Use renamed interface
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true);
        const response = await fetch('/api/documents/list');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
         }
         const data = await response.json();
         setDocuments(data || []); // Use the array directly from the response
         setError(null);
       } catch (e: any) {
        console.error('Failed to fetch documents:', e);
        setError('Failed to load documents. Please try again later.');
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }

     fetchDocuments();
   }, []);
 
   return (
     <div className="container mx-auto p-4">
       <h1 className="text-2xl font-bold mb-4">My Documents</h1>
      {loading && <p>Loading documents...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && documents.length === 0 && (
        <p>No documents found.</p>
      )}
      {!loading && !error && documents.length > 0 && (
        // Use the installed component, adapting its props as needed
        // The original component might need adjustments to accept dynamic data
        // Use the new ExpandableDocumentCard component
         <div className="py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto"> {/* Adjusted gap */}
              {documents.map((doc) => (
                <ExpandableDocumentCard key={doc.id} document={doc} />
              ))}
            </div>
         </div>
      )}
    </div>
  );
}
