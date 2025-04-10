import { createClient } from '@/lib/supabase/server'; // Use the ssr helper
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
    console.error('Pin API Error: No active session or session error', sessionError);
    return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Get the pinned status from the request body
  let pinned: boolean;
  try {
    const body = await request.json();
    if (typeof body.pinned !== 'boolean') {
      return NextResponse.json({ error: 'Bad Request: Pinned status (boolean) is required' }, { status: 400 });
    }
    pinned = body.pinned;
  } catch (e) {
    console.error('Pin API Error: Failed to parse request body', e);
    return NextResponse.json({ error: 'Bad Request: Invalid JSON body' }, { status: 400 });
  }

  // 3. Validate document ID
  if (!documentId) {
    return NextResponse.json({ error: 'Bad Request: Document ID is required' }, { status: 400 });
  }

  console.log(`Pin API: Attempting to set pinned status of document ${documentId} to ${pinned} for user ${userId}`);

  try {
    // 4. Update the document's pinned status in Supabase
    // Ensure you have a 'pinned' column (boolean, nullable) in your 'documents' table
    const { data, error: updateError } = await supabase
      .from('documents')
      .update({ pinned: pinned, updated_at: new Date().toISOString() }) // Also update updated_at
      .eq('id', documentId)
      .eq('user_id', userId) // Ensure the user owns the document
      .select('id, pinned') // Select something to confirm the update
      .single(); // Use single for error checking

    // 5. Handle potential errors during update
    if (updateError) {
      console.error(`Pin API Error: Failed to update document ${documentId}`, updateError);
      if (updateError.code === 'PGRST116') {
         return NextResponse.json({ error: 'Not Found: Document not found or user does not have permission' }, { status: 404 });
      }
      // Handle potential error if 'pinned' column doesn't exist (e.g., 42703 undefined_column)
      if (updateError.code === '42703') {
          console.error("Pin API Error: 'pinned' column likely missing in 'documents' table.");
          return NextResponse.json({ error: "Internal Server Error: Database configuration issue (missing 'pinned' column)." }, { status: 500 });
      }
      return NextResponse.json({ error: `Internal Server Error: ${updateError.message}` }, { status: 500 });
    }

    // 6. Check if the update actually happened
    if (!data) {
        console.warn(`Pin API Warning: Update command succeeded but no data returned for document ${documentId}.`);
        return NextResponse.json({ error: 'Not Found: Document not found or user does not have permission' }, { status: 404 });
    }

    // 7. Return success response
    console.log(`Pin API: Successfully updated pinned status for document ${documentId} to ${data.pinned} for user ${userId}`);
    return NextResponse.json({ message: 'Document pin status updated successfully', id: data.id, pinned: data.pinned }, { status: 200 });

  } catch (e: any) {
    console.error('Pin API Error: Unexpected error', e);
    return NextResponse.json({ error: `Internal Server Error: ${e.message || 'Unknown error'}` }, { status: 500 });
  }
}
