'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClientClient } from '@/lib/supabaseBrowserClient'; // Import from the new browser-specific file

export default function AuthForm() {
  const [isLoginMode, setIsLoginMode] = useState(true); // true = Login, false = Signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // For signup
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClientClient();

  // --- Validation Logic ---
  const isLoginButtonDisabled = !email || !password || loading;
  const isSignupButtonDisabled = !email || !password || !confirmPassword || loading;
  const isButtonDisabled = isLoginMode ? isLoginButtonDisabled : isSignupButtonDisabled;

  // --- Event Handlers ---
  const handleLogin = async () => {
    // Basic validation (already covered by button disable, but good practice)
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    console.log('Attempting login with:', email);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error('Login error:', loginError);
      setError(loginError.message);
    } else {
      setMessage('Login successful! Refreshing...');
      window.location.reload(); // Reload to let server component redirect
    }

    setLoading(false);
  };

  const handleSignup = async () => {
     // Client-side validation
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields to sign up.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);
    console.log('Attempting signup with:', email);

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Optional: Add email redirect URL if needed for your flow
        // emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {}, // Can add user metadata here if needed
      }
    });

     if (signupError) {
      console.error('Signup error:', signupError);
      setError(signupError.message);
    } else {
      setMessage('Signup successful! Check your email for the confirmation link.');
      // Clear fields after successful signup request
      // setEmail('');
      // setPassword('');
      // setConfirmPassword('');
    }

    setLoading(false);
  };

  // Handle form submission based on mode
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoginMode) {
      await handleLogin();
    } else {
      await handleSignup();
    }
  };

  // Toggle between Login and Signup modes
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError(null); // Clear errors on mode switch
    setMessage(null); // Clear messages on mode switch
    // Optionally clear fields on mode switch?
    // setEmail('');
    // setPassword('');
    // setConfirmPassword('');
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {/* Dynamic Title/Description */}
          <CardTitle>{isLoginMode ? 'Login' : 'Sign Up'}</CardTitle>
          <CardDescription>
            {isLoginMode ? 'Enter your credentials to access your account.' : 'Create an account to get started.'}
          </CardDescription>
        </CardHeader>
        {/* Use the new handleSubmit */}
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
               <Input
                id="email"
                type="email"
                autoComplete="email" // Add autocomplete hint
                 placeholder="you@example.com"
                required
                value={email}
                // Clear specific error on input change
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                 disabled={loading}
              />
            </div>
            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isLoginMode ? "current-password" : "new-password"} // Add autocomplete hint
                required
                value={password}
                 // Clear specific error on input change
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                disabled={loading}
              />
            </div>
             {/* Confirm Password Input (Signup only) */}
            {!isLoginMode && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password" // Add autocomplete hint
                  required
                  value={confirmPassword}
                   // Clear specific error on input change
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  disabled={loading}
                />
              </div>
            )}
             {/* Display Error/Message */}
            {error && <p className="text-red-500 text-sm pt-2">{error}</p>}
            {message && <p className="text-green-500 text-sm pt-2">{message}</p>}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
             {/* Dynamic Primary Button */}
             <Button type="submit" className="w-full" disabled={isButtonDisabled}>
              {loading ? (
                <>{isLoginMode ? 'Logging in' : 'Signing up'}...</>
              ) : (
                isLoginMode ? 'Login' : 'Sign Up'
              )}
            </Button>
             {/* Toggle Mode Link/Button */}
            <Button type="button" variant="link" size="sm" onClick={toggleMode} className="text-muted-foreground">
              {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
