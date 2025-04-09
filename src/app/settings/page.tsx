'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// Import the actual ThemeToggle component
import { ThemeToggle } from '@/components/ThemeToggle';

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Appearance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Theme</h3>
              <p className="text-sm text-muted-foreground mb-3">Select your preferred theme.</p>
              {/* Replace placeholder with the actual component */}
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Manage your subscription plan and billing details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Current Plan</h3>
              <p className="text-lg font-semibold">Free</p> {/* Placeholder */}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Manage</h3>
               <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Disabled button as placeholder */}
                    <span tabIndex={0}> {/* Wrap in span for tooltip on disabled */}
                      <Button disabled>Manage Subscription</Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Subscription management coming soon!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
