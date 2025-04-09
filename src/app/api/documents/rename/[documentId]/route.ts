import { createServerActionClient } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function PUT(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;
  let newName: string;

  try {
    const body = await request.json();
    newName = body.newName;
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }
  if (!newName || typeof newName !== 'string' || newName.trim() === '') {
    return NextResponse.json({ error: 'New name is required and must be a non-empty string' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerActionClient(cookieStore);

  // Get user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    console.error('Auth error or no session:', sessionError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Update the document title
    const { data, error: updateError } = await supabase
      .from('documents') // Replace 'documents' with your actual table name
      .update({ title: newName.trim(), updated_at: new Date().toISOString() }) // Update title and timestamp
      .eq('id', documentId)
      .eq('user_id', userId) // Ensure user owns the document
      .select('id, title, updated_at') // Select the updated data to return
      .single(); // Expecting a single row update

    if (updateError) {
      console.error('Supabase rename error:', updateError);
      // Check if the error is due to the document not being found for the user
      if (updateError.code === 'PGRST116') { // PostgREST error code for "Matching row not found"
         return NextResponse.json({ error: 'Document not found or you do not have permission to rename it.' }, { status: 404 });
      }
      throw new Error(updateError.message);
    }

    if (!data) {
        // This case might occur if the update didn't return data for some reason, treat as not found
        return NextResponse.json({ error: 'Document not found after update attempt.' }, { status: 404 });
    }

    console.log(`Document ${documentId} renamed successfully for user ${userId} to "${newName.trim()}"`);
    // Return the updated document details
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Error renaming document:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to rename document: ${errorMessage}` }, { status: 500 });
  }
}
