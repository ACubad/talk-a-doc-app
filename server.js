"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
var http_1 = require("http");
var url_1 = require("url");
var next_1 = require("next");
var speech_1 = require("@google-cloud/speech"); // Import protos
var dotenv_1 = require("dotenv");
// Load environment variables from .env.local
dotenv_1.default.config({ path: '.env.local' });
var dev = process.env.NODE_ENV !== 'production';
var hostname = 'localhost';
var port = parseInt(process.env.PORT || '3000', 10);
var wsPort = parseInt(process.env.WS_PORT || '3001', 10); // Separate port for WebSocket
// Initialize Next.js app
var app = (0, next_1.default)({ dev: dev, hostname: hostname, port: port });
var handle = app.getRequestHandler();
// Initialize Google Cloud Speech Client (similar logic to speechClient.ts)
var speechClient = null;
try {
    var credentialsJsonString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJsonString) {
        throw new Error("Missing environment variable: GOOGLE_APPLICATION_CREDENTIALS_JSON in server.ts");
    }
    var cleanedJsonString = credentialsJsonString.startsWith("'") && credentialsJsonString.endsWith("'")
        ? credentialsJsonString.slice(1, -1)
        : credentialsJsonString;
    var credentials = JSON.parse(cleanedJsonString);
    speechClient = new speech_1.SpeechClient({ credentials: credentials });
    console.log('Google Speech Client initialized successfully in server.');
}
catch (error) {
    console.error("Failed to initialize Google Speech Client in server:", error);
    // Decide if the server should exit or continue without speech functionality
    // process.exit(1);
}
app.prepare().then(function () {
    // Create HTTP server for Next.js
    var httpServer = (0, http_1.createServer)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var parsedUrl, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    parsedUrl = (0, url_1.parse)(req.url, true);
                    return [4 /*yield*/, handle(req, res, parsedUrl)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.error('Error occurred handling', req.url, err_1);
                    res.statusCode = 500;
                    res.end('internal server error');
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Create WebSocket server
    var wss = new ws_1.WebSocketServer({ port: wsPort });
    console.log("WebSocket Server listening on ws://".concat(hostname, ":").concat(wsPort));
    wss.on('connection', function (ws) {
        console.log('Client connected via WebSocket');
        var recognizeStream = null; // Type properly later
        ws.on('message', function (message) {
            var msgString = message.toString();
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
                var languageCode = 'en-US'; // Hardcoded for now
                // Define the streaming configuration
                var streamingConfig = {
                    config: {
                        encoding: speech_1.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16, // Use Enum
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
                    .on('error', function (error) {
                    console.error('Speech API Error:', error);
                    ws.send(JSON.stringify({ type: 'error', message: "Speech API Error: ".concat(error.message) }));
                    recognizeStream = null; // Reset stream on error
                })
                    .on('data', function (data) {
                    var _a, _b, _c;
                    // Send transcription results back to the client
                    var transcription = (_b = (_a = data.results[0]) === null || _a === void 0 ? void 0 : _a.alternatives[0]) === null || _b === void 0 ? void 0 : _b.transcript;
                    var isFinal = (_c = data.results[0]) === null || _c === void 0 ? void 0 : _c.isFinal;
                    if (transcription) {
                        // console.log(`Transcription: ${transcription}, Final: ${isFinal}`);
                        ws.send(JSON.stringify({ type: 'transcript', text: transcription, isFinal: isFinal }));
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
        ws.on('close', function () {
            console.log('Client disconnected');
            if (recognizeStream) {
                recognizeStream.end();
                recognizeStream = null;
                console.log('Speech recognize stream ended due to client disconnect.');
            }
        });
        ws.on('error', function (error) {
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
        .listen(port, hostname, function () {
        console.log("> Ready on http://".concat(hostname, ":").concat(port));
    })
        .on('error', function (err) {
        console.error('HTTP Server Error:', err);
        process.exit(1);
    });
}).catch(function (ex) {
    console.error('Next.js app preparation error:', ex.stack);
    process.exit(1);
});
