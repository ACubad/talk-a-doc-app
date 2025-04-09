'use client';

import * as React from 'react';
import { Moon, Sun, Laptop } from 'lucide-react'; // Import icons
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // Import cn utility

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Helper function to determine button variant
  const getVariant = (buttonTheme: string) => {
    return theme === buttonTheme ? 'default' : 'outline';
  };

  return (
    <div className="flex space-x-2 rounded-md border p-1">
      <Button
        variant={getVariant('light')}
        size="sm"
        onClick={() => setTheme('light')}
        className={cn("flex-1 justify-center")} // Use cn for conditional classes if needed later
      >
        <Sun className="h-4 w-4 mr-2" />
        Light
      </Button>
      <Button
        variant={getVariant('dark')}
        size="sm"
        onClick={() => setTheme('dark')}
        className={cn("flex-1 justify-center")}
      >
        <Moon className="h-4 w-4 mr-2" />
        Dark
      </Button>
      <Button
        variant={getVariant('system')}
        size="sm"
        onClick={() => setTheme('system')}
        className={cn("flex-1 justify-center")}
      >
        <Laptop className="h-4 w-4 mr-2" />
        System
      </Button>
    </div>
  );
}
