'use client';

import React from 'react'; // Removed useState, useEffect
import { ExpandableDocumentCard } from '@/components/ExpandableDocumentCard';
import { useAppContext } from '@/components/AppLayout'; // Import the context hook

// DocumentSummary interface is now implicitly handled by HistoryItem from context

export default function DocsPage() {
  // Get history state and fetch function from context
  const {
    historyItems,
    isHistoryLoading,
    historyError,
    fetchHistory // Function to refresh the list
  } = useAppContext();

  // Remove local state and useEffect for fetching

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Documents</h1>
      {/* Use context state for loading and error display */}
      {isHistoryLoading && <p>Loading documents...</p>}
      {historyError && <p className="text-red-500">Error: {historyError}</p>}
      {!isHistoryLoading && !historyError && historyItems.length === 0 && (
        <p>No documents found.</p>
      )}
      {!isHistoryLoading && !historyError && historyItems.length > 0 && (
        <div className="py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {/* Map over historyItems from context */}
            {historyItems.map((doc) => (
              <ExpandableDocumentCard
                key={doc.id}
                document={doc}
                // Pass the fetchHistory function down to the card
                // Renaming prop for clarity in the card component
                onActionSuccess={fetchHistory}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
