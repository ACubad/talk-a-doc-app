import { createClient } from '@/lib/supabase/server'; // Assuming you have a server client setup as per ssr docs
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Force dynamic routing for Next.js App Router
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  // const cookieStore = cookies(); // No longer needed here
  const supabase = createClient(); // Call without arguments
  const documentId = params.documentId;

  // 1. Check for authenticated user
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) {
    console.error('Rename API Error: No active session or session error', sessionError);
    return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Get the new title from the request body
  let newTitle: string;
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'Bad Request: New title is required and must be a non-empty string' }, { status: 400 });
    }
    newTitle = body.title.trim();
  } catch (e) {
    console.error('Rename API Error: Failed to parse request body', e);
    return NextResponse.json({ error: 'Bad Request: Invalid JSON body' }, { status: 400 });
  }

  // 3. Validate document ID
  if (!documentId) {
    return NextResponse.json({ error: 'Bad Request: Document ID is required' }, { status: 400 });
  }

  console.log(`Rename API: Attempting to rename document ${documentId} to "${newTitle}" for user ${userId}`);

  try {
    // 4. Update the document title in Supabase
    const { data, error: updateError } = await supabase
      .from('documents')
      .update({ title: newTitle, updated_at: new Date().toISOString() }) // Also update updated_at timestamp
      .eq('id', documentId)
      .eq('user_id', userId) // Ensure the user owns the document
      .select('id') // Select something to confirm the update happened
      .single(); // Use single to ensure only one row is affected and get potential errors

    // 5. Handle potential errors during update
    if (updateError) {
      console.error(`Rename API Error: Failed to update document ${documentId}`, updateError);
      // Check if the error is because the document wasn't found or didn't belong to the user
      if (updateError.code === 'PGRST116') { // PostgREST error code for 'No rows found'
         return NextResponse.json({ error: 'Not Found: Document not found or user does not have permission' }, { status: 404 });
      }
      return NextResponse.json({ error: `Internal Server Error: ${updateError.message}` }, { status: 500 });
    }

    // 6. Check if the update actually happened (data should exist)
    if (!data) {
        console.warn(`Rename API Warning: Update command succeeded but no data returned for document ${documentId}. This might indicate the document didn't exist or wasn't owned by user ${userId}.`);
        // This case might be covered by PGRST116, but added as a safeguard.
        return NextResponse.json({ error: 'Not Found: Document not found or user does not have permission' }, { status: 404 });
    }

    // 7. Return success response
    console.log(`Rename API: Successfully renamed document ${documentId} for user ${userId}`);
    return NextResponse.json({ message: 'Document renamed successfully', id: data.id }, { status: 200 });

  } catch (e: any) {
    console.error('Rename API Error: Unexpected error', e);
    return NextResponse.json({ error: `Internal Server Error: ${e.message || 'Unknown error'}` }, { status: 500 });
  }
}
