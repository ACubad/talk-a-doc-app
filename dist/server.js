// Only import WebSocket related modules and dependencies needed for the WS server
import { WebSocketServer } from 'ws';
import { SpeechClient, protos } from '@google-cloud/speech';
import dotenv from 'dotenv';
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });
const hostname = 'localhost'; // Keep for logging if needed
const wsPort = parseInt(process.env.WS_PORT || '3001', 10);
// Initialize Google Cloud Speech Client
let speechClient = null;
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
}
catch (error) {
    console.error("Failed to initialize Google Speech Client in server:", error);
    // Decide if the server should exit or continue without speech functionality
    // process.exit(1); // Keep error handling for Speech Client
}
// Create WebSocket server directly
const wss = new WebSocketServer({ port: wsPort });
console.log(`WebSocket Server listening on ws://${hostname}:${wsPort}`);
wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    let recognizeStream = null; // Type properly later
    ws.on('message', (message) => {
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
            const streamingConfig = {
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
                .on('error', (error) => {
                console.error('Speech API Error:', error);
                ws.send(JSON.stringify({ type: 'error', message: `Speech API Error: ${error.message}` }));
                recognizeStream = null; // Reset stream on error
            })
                .on('data', (data) => {
                var _a, _b, _c;
                // Send transcription results back to the client
                const transcription = (_b = (_a = data.results[0]) === null || _a === void 0 ? void 0 : _a.alternatives[0]) === null || _b === void 0 ? void 0 : _b.transcript;
                const isFinal = (_c = data.results[0]) === null || _c === void 0 ? void 0 : _c.isFinal;
                if (transcription) {
                    // console.log(`Transcription: ${transcription}, Final: ${isFinal}`);
                    ws.send(JSON.stringify({ type: 'transcript', text: transcription, isFinal }));
                }
            });
            console.log('Speech recognize stream started.');
        }
        else if (msgString === 'end_stream') {
            console.log('Received end_stream command');
            if (recognizeStream) {
                recognizeStream.end();
                recognizeStream = null;
                console.log('Speech recognize stream ended.');
            }
        }
        else {
            // Assume it's audio data
            if (recognizeStream) {
                recognizeStream.write(message);
            }
            else {
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
    ws.on('error', (error) => {
        console.error('WebSocket Error:', error);
        if (recognizeStream) {
            recognizeStream.destroy(error); // Use destroy for forceful closure on error
            recognizeStream = null;
        }
    });
    // Removed immediate info message send
});
// Removed HTTP server and app.prepare logic
