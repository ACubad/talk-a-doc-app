import { createServerActionClient } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function PUT(
  request: Request, // Keep request parameter, might be needed for future extensions
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
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
    // 1. Fetch the current pinned status
    const { data: currentDoc, error: fetchError } = await supabase
      .from('documents') // Replace 'documents' with your actual table name
      .select('id, pinned') // Select only id and pinned status
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !currentDoc) {
      console.error('Error fetching document for pinning or not found/unauthorized:', fetchError);
      return NextResponse.json({ error: 'Document not found or you do not have permission to modify it.' }, { status: 404 });
    }

    // 2. Determine the new pinned status (toggle)
    const newPinnedStatus = !currentDoc.pinned;

    // 3. Update the document with the new pinned status and timestamp
    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents') // Replace 'documents' with your actual table name
      .update({ pinned: newPinnedStatus, updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('user_id', userId)
      .select('id, pinned, updated_at') // Select updated data
      .single();

    if (updateError) {
      console.error('Supabase pin/unpin error:', updateError);
      throw new Error(updateError.message);
    }

     if (!updatedDoc) {
        // Should not happen if fetch succeeded, but handle defensively
        return NextResponse.json({ error: 'Document not found after pin/unpin attempt.' }, { status: 404 });
    }

    console.log(`Document ${documentId} pin status toggled to ${newPinnedStatus} for user ${userId}`);
    // Return the updated document details
    return NextResponse.json(updatedDoc, { status: 200 });

  } catch (error) {
    console.error('Error toggling pin status:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to toggle pin status: ${errorMessage}` }, { status: 500 });
  }
}
