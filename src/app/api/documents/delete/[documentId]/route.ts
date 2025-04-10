import { createServerActionClient } from '@/lib/supabaseClient'; // Use the correct server client function
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const cookieStore = await cookies(); // Await the cookies() call
  const supabase = createServerActionClient(cookieStore); // Initialize with the correct function
  const { documentId } = params;

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }

  try {
    // First, check if the user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Proceed with deletion
    // Note: Supabase RLS policies should ensure users can only delete their own documents.
    // Add explicit check if RLS is not configured for this.
    const { error: deleteError } = await supabase
      .from('documents') // Make sure 'documents' is your table name
      .delete()
      .match({ id: documentId, user_id: user.id }); // Ensure user owns the document

    if (deleteError) {
      console.error(`Error deleting document ${documentId}:`, deleteError);
      // Check for specific errors, e.g., not found
      if (deleteError.code === 'PGRST116') { // PostgREST error code for 'Not Found' might vary
          return NextResponse.json({ error: 'Document not found or you do not have permission to delete it.' }, { status: 404 });
      }
      return NextResponse.json({ error: `Failed to delete document: ${deleteError.message}` }, { status: 500 });
    }

    // Return success response (No Content)
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Unexpected error during document deletion:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
