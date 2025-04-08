import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerActionClient } from '@/lib/supabaseClient';

// Define the structure for individual transcriptions in the request
interface TranscriptionData {
  transcribed_text: string;
  order: number;
  original_filename?: string; // Optional
}

// Define the expected request body structure for saving/updating
interface SaveDocumentRequestBody {
  documentId?: string; // UUID of the document to update (optional)
  title: string;
  inputLanguage: string;
  outputLanguage: string;
  documentType: string;
  generatedContent: string;
  outputFormat: string; // e.g., 'DOCX', 'PDF' - Assuming this comes from frontend state
  transcriptions: TranscriptionData[];
}

export async function POST(request: Request) {
  const cookieStore = await cookies(); // Added await here
  const supabase = createServerActionClient(cookieStore);

  try {
    // 1. Get User Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Save API - Auth Error:', authError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;

    // 2. Parse Request Body
    const body: SaveDocumentRequestBody = await request.json();
    const {
      documentId: existingDocumentId, // Renamed for clarity
      title,
      inputLanguage,
      outputLanguage,
      documentType,
      generatedContent,
      outputFormat,
      transcriptions,
    } = body;

    // Basic validation
    if (!title || !inputLanguage || !outputLanguage || !documentType || !generatedContent || !outputFormat || !transcriptions || transcriptions.length === 0) {
      return NextResponse.json({ error: 'Missing required fields in request body' }, { status: 400 });
    }

    let finalDocumentId: string;

    // 3. Upsert Document Data (Insert or Update)
    if (existingDocumentId) {
      // --- UPDATE existing document ---
      console.log(`Updating document ID: ${existingDocumentId}`);
      finalDocumentId = existingDocumentId;

      const { error: updateDocError } = await supabase
        .from('documents')
        .update({
          title: title,
          input_language: inputLanguage,
          output_language: outputLanguage,
          document_type: documentType,
          generated_content: generatedContent,
          output_format: outputFormat,
          updated_at: new Date().toISOString(), // Manually set, though trigger should handle it
        })
        .eq('id', finalDocumentId)
        .eq('user_id', userId); // Ensure user owns the doc

      if (updateDocError) {
        console.error('Error updating document:', updateDocError);
        throw new Error(`Failed to update document: ${updateDocError.message}`);
      }

      // Delete old transcriptions for this document before inserting new ones
      const { error: deleteTransError } = await supabase
        .from('transcriptions')
        .delete()
        .eq('document_id', finalDocumentId)
        .eq('user_id', userId); // Ensure user owns them

      if (deleteTransError) {
        console.error('Error deleting old transcriptions:', deleteTransError);
        // Decide if this is critical - maybe log and continue?
        // For now, let's throw to indicate a potential data inconsistency issue.
        throw new Error(`Failed to delete old transcriptions: ${deleteTransError.message}`);
      }

    } else {
      // --- INSERT new document ---
      console.log('Inserting new document');
      const { data: newDocData, error: insertDocError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          title: title,
          input_language: inputLanguage,
          output_language: outputLanguage,
          document_type: documentType,
          generated_content: generatedContent,
          output_format: outputFormat,
        })
        .select('id') // Select the ID of the newly inserted row
        .single(); // Expect only one row back

      if (insertDocError || !newDocData) {
        console.error('Error inserting document:', insertDocError);
        throw new Error(`Failed to insert document: ${insertDocError?.message || 'No data returned'}`);
      }
      finalDocumentId = newDocData.id;
      console.log(`New document inserted with ID: ${finalDocumentId}`);
    }

    // 4. Insert Transcription Data (always happens after insert/update)
    const transcriptionInserts = transcriptions.map(t => ({
      document_id: finalDocumentId,
      user_id: userId, // Denormalized user_id
      transcribed_text: t.transcribed_text,
      order: t.order,
      original_filename: t.original_filename, // Include if provided
    }));

    const { error: insertTransError } = await supabase
      .from('transcriptions')
      .insert(transcriptionInserts);

    if (insertTransError) {
      console.error('Error inserting transcriptions:', insertTransError);
      // If insert failed after document creation, should we delete the document?
      // For simplicity now, we'll just report the error. Consider cleanup logic later.
      throw new Error(`Failed to insert transcriptions: ${insertTransError.message}`);
    }

    console.log(`Successfully saved/updated document ${finalDocumentId} with ${transcriptions.length} transcriptions.`);

    // 5. Return Success Response
    return NextResponse.json({
      message: 'Document saved successfully',
      documentId: finalDocumentId, // Return the ID
    });

  } catch (error) {
    console.error('Error in /api/documents/save:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during save';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
