'use client';

import { useRouter } from "next/navigation";
import { createClientClient } from "@/lib/supabaseBrowserClient";
import { Button } from "./ui/button"; // Assuming Button is in ui folder
import { LogOut } from "lucide-react"; // Import the LogOut icon
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface LogoutButtonProps {
  open?: boolean; // Make open prop optional
}

export default function LogoutButton({ open = true }: LogoutButtonProps) { // Default open to true if not provided
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
    <Button
      variant="ghost"
      className={cn(
        "w-full flex items-center gap-2 py-2", // Simplified classes, removed group/sidebar
        open ? "justify-start" : "justify-center" // Adjust justification based on open state
      )}
      onClick={handleLogout}
    >
      <LogOut className="w-4 h-4 flex-shrink-0" /> {/* Added flex-shrink-0 */}
      {open && ( // Conditionally render the text
        <span className="text-neutral-700 dark:text-neutral-200 text-sm transition duration-150 whitespace-pre inline-block !p-0 !m-0 overflow-hidden"> {/* Removed group hover effect */}
          Sign Out
        </span>
      )}
    </Button>
  );
}
