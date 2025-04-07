import { useState, useEffect, useRef, useCallback } from 'react';

// Define the shape of the API response
interface TranscriptionResponse {
  transcription?: string;
  error?: string;
}

// Interface for a single transcription item
interface TranscriptionItem {
  id: string; // Unique identifier
  text: string;
  isLoading: boolean;
  error: string | null;
  // audioBlob?: Blob; // Optional: Store the blob if needed later
}

export function useTranscription() {
  // State variables
  const [isRecording, setIsRecording] = useState(false);
  // Replace single string state with an array of items
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null); // Keep top-level error for now? Maybe move into items?
  const [isLoading, setIsLoading] = useState(false); // Keep top-level loading for now? Maybe move into items?

  // Refs for audio recording
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const mediaStream = useRef<MediaStream | null>(null);

  // Helper to generate simple IDs (replace with uuid later if needed)
  const generateId = () => Date.now().toString();

  // Function to send audio blob to the API - Modified for array state
  const sendAudioToApi = useCallback(async (audioBlob: Blob, languageCode: string) => {
    const itemId = generateId();

    // Add a placeholder item to the state immediately
    setTranscriptions(prev => [
      ...prev,
      { id: itemId, text: '', isLoading: true, error: null }
    ]);

    // setError(null); // Clear top-level error? Or handle per item?
    // setIsLoading(true); // Handled per item now

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm'); // Sending as webm, adjust if needed
    formData.append('languageCode', languageCode);

    try {
      const response = await fetch('/api/transcribe', { // New API endpoint
        method: 'POST',
        body: formData,
      });

      const result: TranscriptionResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Update the specific item in the state based on the result
      if (result.error) {
        setTranscriptions(prev => prev.map(item =>
          item.id === itemId ? { ...item, isLoading: false, error: `Transcription error: ${result.error}` } : item
        ));
      // Ensure text is always a string, default to empty if undefined
      } else if (typeof result.transcription === 'string' || result.transcription === undefined) {
        setTranscriptions(prev => prev.map(item =>
          item.id === itemId ? { ...item, isLoading: false, text: result.transcription || '' } : item
        ));
      } else {
        setTranscriptions(prev => prev.map(item =>
          item.id === itemId ? { ...item, isLoading: false, error: 'Transcription failed: Unexpected response format.' } : item
        ));
      }
    } catch (err) {
      console.error('Error sending audio to API:', err);
      // Update the specific item with the error
      setTranscriptions(prev => prev.map(item =>
        item.id === itemId ? { ...item, isLoading: false, error: `API request failed: ${err instanceof Error ? err.message : String(err)}` } : item
      ));
      // setError(`API request failed: ${err instanceof Error ? err.message : String(err)}`); // Keep top-level error?
    } finally {
      // setIsLoading(false); // Loading is per-item now
    }
    // Dependency array: Include setTranscriptions
  }, [setTranscriptions]);

  // Start recording audio
  const startRecording = useCallback(async () => {
    if (isRecording) {
      console.log('Already recording.');
      return;
    }

    const recordingId = generateId(); // Generate ID for this recording
    // Add placeholder for the new recording
    setTranscriptions(prev => [
      ...prev,
      { id: recordingId, text: 'Recording...', isLoading: true, error: null }
    ]);
    // setError(null); // Clear top-level error?
    audioChunks.current = []; // Clear previous audio chunks for the new recording

    try {
      // Get microphone access
      mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // --- MediaRecorder Setup ---
      // Determine supported MIME type
      const options = { mimeType: 'audio/webm' }; // Prefer webm
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.warn(`${options.mimeType} not supported, trying default.`);
        // Let the browser choose the default mimeType
        mediaRecorder.current = new MediaRecorder(mediaStream.current);
      } else {
        mediaRecorder.current = new MediaRecorder(mediaStream.current, options);
      }

      mediaRecorder.current.ondataavailable = (event) => {
        console.log(`ondataavailable event fired. Data size: ${event.data.size}`); // Log data event
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        console.log('>>> MediaRecorder onstop event triggered.'); // Log stop event start
        console.log(`   Number of audio chunks recorded: ${audioChunks.current.length}`); // Log chunk count
        // Check if any audio data was captured
        if (audioChunks.current.length === 0) {
            console.warn('   No audio data captured (audioChunks is empty). Setting error.'); // Log empty chunk case
            setError('No audio data was recorded. Please try recording for a longer duration.');
            setIsLoading(false); // Ensure loading state is reset
             // Clean up stream tracks even if no data
            if (mediaStream.current) {
                console.log('   Cleaning up media stream tracks (no data).');
                mediaStream.current.getTracks().forEach(track => track.stop());
                mediaStream.current = null;
            }
            return; // Don't proceed if no data
        }

        // Combine chunks into a single Blob
        const audioBlob = new Blob(audioChunks.current, { type: mediaRecorder.current?.mimeType || 'audio/webm' });
        console.log(`   Recorded Blob size: ${audioBlob.size}, type: ${audioBlob.type}`);
        // TODO: Get language code from UI state
        const languageCode = 'en-US'; // Hardcoded for now
        console.log(`   Processing recorded audio blob for item ID: ${recordingId} with language: ${languageCode}`);

        // --- Directly process the blob and update the state for recordingId ---
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('languageCode', languageCode);

        fetch('/api/transcribe', { method: 'POST', body: formData })
          .then(response => {
            if (!response.ok) {
              return response.json().then(err => { throw new Error(err.error || `HTTP error! status: ${response.status}`) });
            }
            return response.json();
          })
          .then((result: TranscriptionResponse) => {
            if (result.error) {
              setTranscriptions(prev => prev.map(item =>
                item.id === recordingId ? { ...item, isLoading: false, error: `Transcription error: ${result.error}` } : item
              ));
            } else if (typeof result.transcription === 'string' || result.transcription === undefined) {
              setTranscriptions(prev => prev.map(item =>
                item.id === recordingId ? { ...item, isLoading: false, text: result.transcription || '' } : item
              ));
            } else {
               setTranscriptions(prev => prev.map(item =>
                 item.id === recordingId ? { ...item, isLoading: false, error: 'Transcription failed: Unexpected response format.' } : item
               ));
            }
          })
          .catch(err => {
            console.error('Error processing recorded audio:', err);
            setTranscriptions(prev => prev.map(item =>
              item.id === recordingId ? { ...item, isLoading: false, error: `Processing failed: ${err instanceof Error ? err.message : String(err)}` } : item
            ));
          });
        // --- End direct processing ---

        // Clean up stream tracks after stopping and processing
        if (mediaStream.current) {
            console.log('   Cleaning up media stream tracks (after processing).');
            mediaStream.current.getTracks().forEach(track => track.stop());
            mediaStream.current = null;
        }
        console.log('<<< MediaRecorder onstop event finished.'); // Log stop event end
      };

      mediaRecorder.current.onerror = (event) => {
        console.error('!!! MediaRecorder Error Event:', event); // Log error event
        setError(`MediaRecorder error: ${event instanceof Error ? event.message : 'Unknown error'}`);
        setIsRecording(false);
        // Clean up stream tracks on error
        if (mediaStream.current) {
            console.log('   Cleaning up media stream tracks (onerror).');
            mediaStream.current.getTracks().forEach(track => track.stop());
            mediaStream.current = null;
        }
      };

      console.log('Attempting to start MediaRecorder...'); // Log before start
      mediaRecorder.current.start(1000); // Start recording with 1-second timeslice
      // --- End MediaRecorder Setup ---

      setIsRecording(true);
      console.log('Recording started successfully with MediaRecorder.'); // Confirm start call completed

    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Error accessing microphone: ${err instanceof Error ? err.message : String(err)}`);
      setIsRecording(false);
      // Clean up any partial setup
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
        mediaStream.current = null;
      }
    }
  }, [isRecording, sendAudioToApi]); // Added dependencies

  // Stop recording audio
  const stopRecording = useCallback(() => {
    // Check the actual recorder state instead of the React state
    if (!mediaRecorder.current || mediaRecorder.current.state !== 'recording') {
        console.log(`stopRecording called but recorder not active. State: ${mediaRecorder.current?.state}`);
        return;
    }

  console.log(`>>> Calling mediaRecorder.stop(). Current state: ${mediaRecorder.current.state}`); // Log state before stopping
  // Stop the recorder *before* updating the state
  mediaRecorder.current.stop(); // This triggers the 'onstop' event where audio is processed
  setIsRecording(false); // Update state after stopping
  // Stream tracks are stopped in the 'onstop' handler now
  console.log('<<< mediaRecorder.stop() called.'); // Log stop call completion

  }, [isRecording]); // Add isRecording dependency back

  // Effect for cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Cleanup effect running on unmount or state change.');
      if (isRecording) {
        console.log('   Component unmounting/changing while recording. Stopping recording.');
        stopRecording(); // Ensure recording stops on unmount
      }
      // Ensure any lingering stream tracks are stopped
      if (mediaStream.current) {
        console.log('   Cleaning up lingering media stream tracks in cleanup effect.');
        mediaStream.current.getTracks().forEach(track => track.stop());
      }
    };
  // Use an empty dependency array to ensure cleanup only runs on unmount.
  }, []);


  // Function to update a specific transcription item's text
  const updateTranscriptionText = useCallback((id: string, newText: string) => {
    setTranscriptions(prev => prev.map(item => item.id === id ? { ...item, text: newText } : item));
  }, [setTranscriptions]);

  return {
    isRecording,
    transcriptions, // Return the array
    error, // Keep top-level error for now
    isLoading, // Keep top-level loading for now
    startRecording,
    stopRecording,
    updateTranscriptionText, // Expose the new setter
    sendAudioToApi, // Expose the function to send audio blobs
  };
}
