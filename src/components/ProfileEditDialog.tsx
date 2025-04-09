"use client";

import { useCharacterLimit } from '@/hooks/useCharacterLimit';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, ImagePlus, Loader2, X } from "lucide-react"; // Added Loader2
import { useId, useState, useEffect, useCallback } from "react"; // Added useEffect, useCallback
import { createClientClient } from '@/lib/supabaseBrowserClient'; // Corrected import name
import { useAppContext } from './AppLayout'; // Import App context hook
// Removed redundant DialogClose import, it's already imported below

// Define Profile type based on DB table
type Profile = {
  id: string;
  updated_at: string | null;
  created_at: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  website: string | null;
  about_me: string | null;
  avatar_url: string | null;
  background_url: string | null;
};

// Renamed from Component to ProfileEditDialog for clarity
function ProfileEditDialogInternal() {
  const id = useId();
  const supabase = createClientClient(); // Use correct function name
  const { updateUserProfile } = useAppContext(); // Get context function

  // State for form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  // State for image file selection
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null); // For username validation

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw userError || new Error('User not found.');
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // Ignore 'no rows found' error
          throw profileError;
        }

        if (data) {
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setUsername(data.username || '');
          setWebsite(data.website || '');
          setAboutMe(data.about_me || '');
          setAvatarUrl(data.avatar_url); // Keep null if not set
          setBackgroundUrl(data.background_url); // Keep null if not set
        }
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError(err.message || 'Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase]);


  // Character limit hook setup (using aboutMe state)
  const maxLength = 180;
  const {
    characterCount,
    maxLength: limit,
  } = useCharacterLimit({
    maxLength,
    initialValue: aboutMe, // Use state value
  });

  // Handle input changes
  const handleAboutMeChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (event.target.value.length <= maxLength) {
      setAboutMe(event.target.value);
    }
  };

  // Function to handle saving profile changes
  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);
    setUsernameError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw userError || new Error('User not found.');
      }

      let newAvatarUrl = avatarUrl; // Start with existing or null
      let newBackgroundUrl = backgroundUrl; // Start with existing or null

      // --- Image Uploads ---
      const uploadImage = async (file: File, bucket: string): Promise<string | null> => {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`; // Unique path per user

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { upsert: true }); // Use upsert for simplicity

        if (uploadError) {
          console.error(`Error uploading to ${bucket}:`, uploadError);
          throw new Error(`Failed to upload image to ${bucket}.`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return urlData?.publicUrl || null;
      };

      if (avatarFile) {
        newAvatarUrl = await uploadImage(avatarFile, 'avatars');
        if (!newAvatarUrl) throw new Error("Failed to get avatar public URL.");
      }
      if (backgroundFile) {
        newBackgroundUrl = await uploadImage(backgroundFile, 'profile-backgrounds');
         if (!newBackgroundUrl) throw new Error("Failed to get background public URL.");
      }
      // --- End Image Uploads ---

      // --- Database Update ---
      const profileUpdate = {
        id: user.id, // Important for upsert
        first_name: firstName,
        last_name: lastName,
        username: username,
        website: website,
        about_me: aboutMe,
        avatar_url: newAvatarUrl,
        background_url: newBackgroundUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileUpdate, { onConflict: 'id' }) // Upsert based on user ID
        .select() // Select to check result, though not strictly needed here
        .single(); // Expect single row back

      if (upsertError) {
        console.error("Error upserting profile:", upsertError);
        // Check for unique constraint violation (code 23505)
        if (upsertError.code === '23505' && upsertError.message.includes('profiles_username_key')) {
           setUsernameError('Username already taken. Please choose another.');
           throw new Error('Username already taken.'); // Prevent further processing
        }
        throw upsertError; // Re-throw other errors
      }
      // --- End Database Update ---

      // --- Update Global Context ---
      updateUserProfile({ username: profileUpdate.username, avatar_url: profileUpdate.avatar_url });
      // --- End Update Global Context ---

      // Close the dialog on success - find the close button and click it
      // This is a bit hacky, ideally Dialog would expose an imperative close handle
      document.getElementById(`${id}-dialog-close`)?.click();

    } catch (err: any) {
      console.error("Error saving profile:", err);
      // Avoid setting generic error if it's a username error
      if (!usernameError) {
         setError(err.message || 'Failed to save profile.');
      }
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <DialogContent className="flex items-center justify-center p-10 sm:max-w-lg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </DialogContent>
    );
  }

  return (
    <DialogContent className="flex flex-col gap-0 overflow-y-visible p-0 sm:max-w-lg [&>button:last-child]:top-3.5">
      <DialogHeader className="contents space-y-0 text-left">
        <DialogTitle className="border-b border-border px-6 py-4 text-base">
          Edit profile
        </DialogTitle>
      </DialogHeader>
      <DialogDescription className="sr-only">
        Make changes to your profile here. You can change your photo and set a username.
      </DialogDescription>
      <div className="overflow-y-auto">
        {/* Pass state and setters to image components */}
        <ProfileBg
          currentImageUrl={backgroundUrl}
          onFileSelect={setBackgroundFile}
        />
        <Avatar
          currentImageUrl={avatarUrl}
          onFileSelect={setAvatarFile}
        />
        <div className="px-6 pb-6 pt-4">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }}>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`${id}-first-name`}>First name</Label>
                <Input
                  id={`${id}-first-name`}
                  placeholder="Your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  type="text"
                  disabled={saving}
                  // required - removed, let backend handle validation if needed
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor={`${id}-last-name`}>Last name</Label>
                <Input
                  id={`${id}-last-name`}
                  placeholder="Your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  type="text"
                  disabled={saving}
                  // required - removed
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-username`}>Username</Label>
              <div className="relative">
                <Input
                  id={`${id}-username`}
                  className={`peer pe-9 ${usernameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Choose a unique username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setUsernameError(null); }}
                  type="text"
                  disabled={saving}
                  required // Keep username required
                  minLength={3} // Match DB constraint
                />
                <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-muted-foreground/80 peer-disabled:opacity-50">
                  {/* TODO: Add dynamic check/error icon based on validation */}
                  <Check
                    size={16}
                    strokeWidth={2}
                    className={`text-emerald-500 ${usernameError ? 'hidden' : ''}`} // Hide check on error
                    aria-hidden="true"
                  />
                   {/* TODO: Add error icon */}
                </div>
              </div>
               {usernameError && <p className="text-xs text-red-600 mt-1">{usernameError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-website`}>Website</Label>
              <div className="flex rounded-lg shadow-sm shadow-black/5">
                <span className="inline-flex items-center rounded-s-lg border border-e-0 border-input bg-background px-3 text-sm text-muted-foreground">
                  https://
                </span>
                <Input
                  id={`${id}-website`}
                  className="-ms-px rounded-s-none shadow-none focus-visible:ring-offset-0 focus-visible:ring-1" // Adjusted focus style
                  placeholder="yourwebsite.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  type="text"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-bio`}>About me</Label> {/* Renamed Label */}
              <Textarea
                id={`${id}-bio`}
                placeholder="Write a few sentences about yourself"
                value={aboutMe} // Use state value
                maxLength={maxLength}
                onChange={handleAboutMeChange} // Use specific handler
                aria-describedby={`${id}-description`}
                disabled={saving}
              />
              <p
                id={`${id}-description`}
                className="mt-2 text-right text-xs text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                {/* Update character count based on state */}
                <span className="tabular-nums">{limit - aboutMe.length}</span> characters left
              </p>
            </div>
          </form>
        </div>
      </div>
      <DialogFooter className="border-t border-border px-6 py-4">
         {/* Add an ID to the close button for programmatic clicking */}
        <DialogClose asChild>
          <Button id={`${id}-dialog-close`} type="button" variant="outline" disabled={saving}>
            Cancel
          </Button>
        </DialogClose>
        {/* Trigger save function on click, disable while saving */}
        <Button type="submit" onClick={handleSaveChanges} disabled={saving}> {/* Changed to type="submit" to potentially leverage form submission */}
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Modified ProfileBg to accept current URL and file selection callback
function ProfileBg({
  currentImageUrl,
  onFileSelect,
}: {
  currentImageUrl: string | null;
  onFileSelect: (file: File | null) => void;
}) {
  const { previewUrl, fileInputRef, handleThumbnailClick, handleFileChange, handleRemove } =
    useImageUpload({ onFileSelect }); // Pass callback to hook

  // Prioritize previewUrl, then currentImageUrl from DB
  const displayImage = previewUrl || currentImageUrl;

  const handleLocalRemove = () => {
    handleRemove(); // Clear preview and file input via hook
    onFileSelect(null); // Ensure parent state knows file is removed
    // We might need a way to signal deletion of the existing DB image on save
  };

  return (
    <div className="h-32">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted">
        {displayImage ? (
          <img
            className="h-full w-full object-cover"
            src={displayImage}
            alt={previewUrl ? "Preview of uploaded image" : "Profile background"}
            width={512}
            height={96}
          />
        ) : (
          <span className="text-sm text-muted-foreground">No background image</span>
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/10 opacity-0 transition-opacity hover:opacity-100">
          <button
            type="button"
            className="z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-offset-2 transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
            onClick={handleThumbnailClick}
            aria-label={displayImage ? "Change background image" : "Upload background image"}
          >
            <ImagePlus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          {displayImage && (
            <button
              type="button"
              className="z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-offset-2 transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
              onClick={handleLocalRemove}
              aria-label="Remove background image"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange} // Hook handles preview and calls onFileSelect
        className="hidden"
        accept="image/*"
        aria-label="Upload background image file"
      />
    </div>
  );
}

// Modified Avatar to accept current URL and file selection callback
function Avatar({
  currentImageUrl,
  onFileSelect,
}: {
  currentImageUrl: string | null;
  onFileSelect: (file: File | null) => void;
}) {
  const { previewUrl, fileInputRef, handleThumbnailClick, handleFileChange } =
    useImageUpload({ onFileSelect }); // Pass callback to hook

  // Prioritize previewUrl, then currentImageUrl from DB
  const displayImage = previewUrl || currentImageUrl;

  return (
    <div className="-mt-10 px-6">
      <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted shadow-sm shadow-black/10 group">
        {displayImage ? (
          <img
            src={displayImage}
            className="h-full w-full object-cover"
            width={80}
            height={80}
            alt={previewUrl ? "Preview of uploaded image" : "Profile avatar"}
          />
        ) : (
           <span className="text-xs text-muted-foreground">No Avatar</span>
        )}
        <button
          type="button"
          className="absolute inset-0 flex items-center justify-center size-full cursor-pointer rounded-full bg-black/30 text-white outline-offset-2 transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
          onClick={handleThumbnailClick}
          aria-label={displayImage ? "Change profile picture" : "Upload profile picture"}
        >
          <ImagePlus size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange} // Hook handles preview and calls onFileSelect
          className="hidden"
          accept="image/*"
          aria-label="Upload profile picture"
        />
      </div>
    </div>
  );
}

// Exporting the main component and the trigger separately
// for easier integration into the sidebar
export { ProfileEditDialogInternal as ProfileEditDialogContent, DialogTrigger };
