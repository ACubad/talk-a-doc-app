import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerActionClient } from '@/lib/supabaseClient';

// Define the expected structure for the response
interface LoadedDocumentData {
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

export async function GET(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  const cookieStore = await cookies();
  const supabase = createServerActionClient(cookieStore);
  const documentId = params.documentId;

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }

  try {
    // 1. Get User Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Load API - Auth Error:', authError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;

    // 2. Fetch the main document details
    const { data: documentData, error: docError } = await supabase
      .from('documents')
      .select('*') // Select all columns for the main document
      .eq('id', documentId)
      .eq('user_id', userId) // Ensure user owns the document
      .single(); // Expect only one document

    if (docError) {
      console.error(`Error fetching document ${documentId}:`, docError);
      if (docError.code === 'PGRST116') { // Code for "No rows found"
        return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
      }
      throw new Error(`Failed to fetch document details: ${docError.message}`);
    }

    if (!documentData) {
        return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    // 3. Fetch associated transcriptions
    const { data: transcriptionsData, error: transError } = await supabase
      .from('transcriptions')
      .select('id, transcribed_text, order, original_filename') // Select needed fields
      .eq('document_id', documentId)
      .eq('user_id', userId) // Ensure user owns transcriptions too (redundant due to document check, but safe)
      .order('order', { ascending: true }); // Order transcriptions correctly

    if (transError) {
      console.error(`Error fetching transcriptions for document ${documentId}:`, transError);
      // If transcriptions fail, should we still return the main doc? Or error out?
      // Let's error out for now to ensure data consistency.
      throw new Error(`Failed to fetch transcriptions: ${transError.message}`);
    }

    // 4. Combine data and return
    const responseData: LoadedDocumentData = {
      ...documentData, // Spread all fields from the document table
      transcriptions: transcriptionsData || [], // Ensure it's an array
    };

    console.log(`Successfully loaded document ${documentId} for user ${userId}`);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error(`Error in /api/documents/load/${documentId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while loading the document';
    // Determine appropriate status code based on error type if possible
    const status = (error as any).message?.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
