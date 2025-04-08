import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerActionClient } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerActionClient(cookieStore);

  try {
    // 1. Get User Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('List API - Auth Error:', authError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;

    // 2. Fetch Documents for the User
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, title, updated_at') // Select only needed fields for the list
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }); // Order by most recently updated

    if (fetchError) {
      console.error('Error fetching documents:', fetchError);
      throw new Error(`Failed to fetch documents: ${fetchError.message}`);
    }

    console.log(`Fetched ${documents?.length || 0} documents for user ${userId}`);

    // 3. Return the list
    return NextResponse.json(documents || []); // Return empty array if null

  } catch (error) {
    console.error('Error in /api/documents/list:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while fetching documents';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Optional: Add revalidation if needed, though likely not for a dynamic list per user
// export const revalidate = 0; // Force dynamic rendering
