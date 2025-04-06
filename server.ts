import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { SpeechClient, protos } from '@google-cloud/speech'; // Import protos
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const wsPort = parseInt(process.env.WS_PORT || '3001', 10); // Separate port for WebSocket

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize Google Cloud Speech Client (similar logic to speechClient.ts)
let speechClient: SpeechClient | null = null;
try {
  const credentialsJsonString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJsonString) {
    throw new Error("Missing environment variable: GOOGLE_APPLICATION_CREDENTIALS_JSON in server.ts");
  }
  const cleanedJsonString = credentialsJsonString.startsWith("'") && credentialsJsonString.endsWith("'")
    ? credentialsJsonString.slice(1, -1)
    : credentialsJsonString;
  const credentials = JSON.parse(cleanedJsonString);
  speechClient = new SpeechClient({ credentials });
  console.log('Google Speech Client initialized successfully in server.');
} catch (error) {
  console.error("Failed to initialize Google Speech Client in server:", error);
  // Decide if the server should exit or continue without speech functionality
  // process.exit(1);
}


app.prepare().then(() => {
  // Create HTTP server for Next.js
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ port: wsPort });
  console.log(`WebSocket Server listening on ws://${hostname}:${wsPort}`);

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected via WebSocket');

    let recognizeStream: any = null; // Type properly later

    ws.on('message', (message: Buffer) => {
      const msgString = message.toString();

      if (msgString === 'start_stream') {
        console.log('Received start_stream command');
        if (!speechClient) {
          console.error('Speech client not initialized. Cannot start stream.');
          ws.send(JSON.stringify({ type: 'error', message: 'Speech client not initialized on server.' }));
          return;
        }
        if (recognizeStream) {
            console.log('Stream already active. Ignoring start command.');
            return;
        }

        // TODO: Get language code from client message later
        const languageCode = 'en-US'; // Hardcoded for now

        // Define the streaming configuration
        const streamingConfig: protos.google.cloud.speech.v1.IStreamingRecognitionConfig = {
          config: {
            encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16, // Use Enum
            sampleRateHertz: 16000, // Adjust based on client audio
            languageCode: languageCode,
            enableAutomaticPunctuation: true,
            model: 'default', // Or specify a model like 'telephony', 'medical_dictation'
          },
          interimResults: true, // Get results as they come
        };

        // Pass only the config to streamingRecognize
        recognizeStream = speechClient
          .streamingRecognize(streamingConfig)
          .on('error', (error: Error) => {
            console.error('Speech API Error:', error);
            ws.send(JSON.stringify({ type: 'error', message: `Speech API Error: ${error.message}` }));
            recognizeStream = null; // Reset stream on error
          })
          .on('data', (data: any) => { // Type properly later
            // Send transcription results back to the client
            const transcription = data.results[0]?.alternatives[0]?.transcript;
            const isFinal = data.results[0]?.isFinal;
            if (transcription) {
              // console.log(`Transcription: ${transcription}, Final: ${isFinal}`);
              ws.send(JSON.stringify({ type: 'transcript', text: transcription, isFinal }));
            }
          });

        console.log('Speech recognize stream started.');

      } else if (msgString === 'end_stream') {
        console.log('Received end_stream command');
        if (recognizeStream) {
          recognizeStream.end();
          recognizeStream = null;
          console.log('Speech recognize stream ended.');
        }
      } else {
        // Assume it's audio data
        if (recognizeStream) {
          recognizeStream.write(message);
        } else {
          // console.log('Received audio data but no active stream.');
        }
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
        console.log('Speech recognize stream ended due to client disconnect.');
      }
    });

    ws.on('error', (error: Error) => {
        console.error('WebSocket Error:', error);
        if (recognizeStream) {
            recognizeStream.destroy(error); // Use destroy for forceful closure on error
            recognizeStream = null;
        }
    });

    ws.send(JSON.stringify({ type: 'info', message: 'WebSocket connection established.' }));
  });

  // Start the HTTP server
  httpServer
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    })
    .on('error', (err) => {
      console.error('HTTP Server Error:', err);
      process.exit(1);
    });

}).catch((ex) => {
  console.error('Next.js app preparation error:', ex.stack);
  process.exit(1);
});
