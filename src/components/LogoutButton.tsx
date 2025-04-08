'use client';

import { useRouter } from 'next/navigation';
import { createClientClient } from '@/lib/supabaseBrowserClient';
import { Button } from './ui/button'; // Assuming Button is in ui folder

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClientClient();

  const handleLogout = async () => {
    console.log('Logout button clicked'); // Add log to confirm click
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error logging out:', error);
      // Optionally: Add user feedback here, e.g., using a toast notification
    } else {
      // Refresh the page to reflect the logged-out state
      // router.refresh(); // Replace with full reload
      window.location.reload();
    }
  };

  return (
    <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
      Sign Out
    </Button>
  );
}
