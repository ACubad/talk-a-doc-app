import { createServerActionClient } from '@/lib/supabaseClient'; // Use the correct server client creator
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Import cookies

export async function DELETE(
  request: Request, // Keep request parameter if needed for other logic, otherwise remove
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;
  const cookieStore = await cookies(); // Await the promise here
  const supabase = createServerActionClient(cookieStore); // Create Supabase client instance

  // Get user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    console.error('Auth error or no session:', sessionError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id; // Get user ID from Supabase session

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }

  try {
    // Fetch the document first to ensure it belongs to the user (userId is now from Supabase session)
    const { data: document, error: fetchError } = await supabase
      .from('documents') // Replace 'documents' with your actual table name
      .select('id, user_id')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !document) {
      console.error('Error fetching document or document not found/unauthorized:', fetchError);
      return NextResponse.json({ error: 'Document not found or you do not have permission to delete it.' }, { status: 404 });
    }

    // Proceed with deletion
    const { error: deleteError } = await supabase
      .from('documents') // Replace 'documents' with your actual table name
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId); // Ensure user owns the document

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      throw new Error(deleteError.message);
    }

    console.log(`Document ${documentId} deleted successfully for user ${userId}`);
    return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting document:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to delete document: ${errorMessage}` }, { status: 500 });
  }
}
