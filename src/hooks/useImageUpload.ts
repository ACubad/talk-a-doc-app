import { useState, useRef, useCallback } from 'react';

// Define props for the hook, including the optional callback
interface UseImageUploadProps {
  onFileSelect?: (file: File | null) => void;
}

export function useImageUpload({ onFileSelect }: UseImageUploadProps = {}) { // Destructure props with default
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null; // Get file or null
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
    // Call the callback if provided
    onFileSelect?.(file);
  }, [onFileSelect]); // Add callback to dependency array

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemove = useCallback(() => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
    // Call the callback with null when removing
    onFileSelect?.(null);
  }, [onFileSelect]); // Add callback to dependency array

  return {
    previewUrl,
    fileInputRef,
    handleFileChange,
    handleThumbnailClick,
    handleRemove,
  };
}
