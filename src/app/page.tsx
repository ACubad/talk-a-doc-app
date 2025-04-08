import { createServerComponentClient } from '@/lib/supabaseClient';
import AuthForm from '@/components/AuthForm';
import MainApp from '@/components/MainApp';
import { cookies } from 'next/headers'; // Required for server component client

// This is now a Server Component
export default async function Home() {
  // Create a Supabase client tailored for Server Components
  // Note: We need to handle the async nature if createServerComponentClient is async
  const supabase = await createServerComponentClient(); // Await if it's async

  // Get the current user session
  const { data: { user } } = await supabase.auth.getUser(); // Revert getUser call

  // Conditionally render AuthForm or MainApp based on user session
  return (
    <>
      {!user ? (
        <AuthForm /> // Show login/signup form if no user
      ) : (
        <MainApp /> // Show the main application if user is logged in
      )}
    </>
  );
}
