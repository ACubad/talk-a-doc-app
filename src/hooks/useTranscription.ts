import { useState, useEffect, useRef, useCallback } from 'react';

// Define the shape of messages received from the WebSocket server
interface WebSocketMessage {
  type: 'info' | 'transcript' | 'error';
  message?: string;
  text?: string;
  isFinal?: boolean;
}

const WEBSOCKET_URL = `ws://localhost:${process.env.NEXT_PUBLIC_WS_PORT || 3001}`; // Use env var if set, else default

export function useTranscription() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // Local recording state
  const [transcription, setTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);

  // Function to connect to WebSocket server
  const connectWebSocket = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected.');
      return;
    }

    console.log(`Attempting to connect WebSocket to ${WEBSOCKET_URL}...`);
    ws.current = new WebSocket(WEBSOCKET_URL);

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
      setError(null);
    };

    ws.current.onclose = (event) => {
      console.log('WebSocket Disconnected:', event.reason, event.code);
      setIsConnected(false);
      setIsRecording(false); // Stop recording if connection drops
      // Optionally attempt to reconnect here
    };

    ws.current.onerror = (event) => {
      console.error('WebSocket Error:', event);
      setError('WebSocket connection error. Is the server running?');
      setIsConnected(false);
      setIsRecording(false);
    };

    ws.current.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        // console.log('Received WS message:', data); // Debugging

        switch (data.type) {
          case 'info':
            console.log('Server Info:', data.message);
            break;
          case 'transcript':
            if (data.text) {
              if (data.isFinal) {
                setTranscription(prev => prev + data.text + ' '); // Append final results
                setInterimTranscription(''); // Clear interim
              } else {
                setInterimTranscription(data.text); // Update interim results
              }
            }
            break;
          case 'error':
            console.error('Server Error:', data.message);
            setError(`Server error: ${data.message}`);
            // Consider stopping recording on server error
            // stopRecording();
            break;
          default:
            console.warn('Unknown message type:', data);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
  }, []);

  // Function to disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (ws.current) {
      console.log('Disconnecting WebSocket...');
      ws.current.close();
      ws.current = null;
      setIsConnected(false);
    }
  }, []);

  // Start recording audio and sending to WebSocket
  const startRecording = useCallback(async (languageCode: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket not connected. Cannot start recording.');
      console.error('WebSocket not connected.');
      return;
    }
    if (isRecording) {
      console.log('Already recording.');
      return;
    }

    setTranscription(''); // Clear previous full transcription
    setInterimTranscription(''); // Clear previous interim transcription
    setError(null);

    try {
      // Get microphone access
      mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create audio processing context and nodes
      audioContext.current = new window.AudioContext();
      const sampleRate = audioContext.current.sampleRate;
      console.log(`AudioContext sample rate: ${sampleRate}`);
      // Note: Google Speech API might prefer 16000Hz. Resampling might be needed.
      // For simplicity now, we use the browser's default. Adjust server config if needed.

      microphone.current = audioContext.current.createMediaStreamSource(mediaStream.current);

      // Using ScriptProcessorNode (older but widely compatible)
      // Buffer size influences latency and processing chunks
      const bufferSize = 4096;
      processor.current = audioContext.current.createScriptProcessor(bufferSize, 1, 1);

      processor.current.onaudioprocess = (event) => {
        if (!isRecording || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

        const inputData = event.inputBuffer.getChannelData(0);
        // Convert Float32Array to Int16Array (LINEAR16)
        const buffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            buffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF; // Scale to 16-bit PCM
        }
        ws.current.send(buffer.buffer); // Send ArrayBuffer
      };

      microphone.current.connect(processor.current);
      processor.current.connect(audioContext.current.destination); // Connect to output (needed for onaudioprocess to fire)

      // Send start message to server
      ws.current.send(JSON.stringify({ command: 'start_stream', languageCode: languageCode })); // Send language
      setIsRecording(true);
      console.log('Recording started');

    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Error accessing microphone: ${err instanceof Error ? err.message : String(err)}`);
      setIsRecording(false);
      // Clean up any partial setup
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
        mediaStream.current = null;
      }
      if (audioContext.current) {
        audioContext.current.close();
        audioContext.current = null;
      }
    }
  }, [isRecording]); // Add isRecording dependency

  // Stop recording audio
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    console.log('Stopping recording...');
    setIsRecording(false);

    // Stop microphone tracks
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }

    // Disconnect audio nodes
    if (processor.current) {
      processor.current.disconnect();
      processor.current = null;
    }
    if (microphone.current) {
      microphone.current.disconnect();
      microphone.current = null;
    }

    // Close AudioContext
    if (audioContext.current && audioContext.current.state !== 'closed') {
      audioContext.current.close();
      audioContext.current = null;
    }

    // Send end message to server
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ command: 'end_stream' }));
    }
    console.log('Recording stopped.');
  }, [isRecording]); // Add isRecording dependency

  // Effect to connect WebSocket on mount and disconnect on unmount
  useEffect(() => {
    connectWebSocket();
    return () => {
      stopRecording(); // Ensure recording stops on unmount
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket, stopRecording]);

  // Effect to stop recording if connection drops
  useEffect(() => {
      if (!isConnected && isRecording) {
          console.log("WebSocket disconnected while recording, stopping recording.");
          stopRecording();
      }
  }, [isConnected, isRecording, stopRecording]);


  return {
    isConnected,
    isRecording,
    transcription,
    interimTranscription,
    error,
    startRecording,
    stopRecording,
    setTranscription, // Allow manual edits
  };
}
