import { SpeechClient } from '@google-cloud/speech';

// Ensure environment variable is set
const credentialsJsonString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

if (!credentialsJsonString) {
  throw new Error("Missing environment variable: GOOGLE_APPLICATION_CREDENTIALS_JSON");
}

let credentials;
try {
  // Remove potential surrounding single quotes and parse the JSON string
  const cleanedJsonString = credentialsJsonString.startsWith("'") && credentialsJsonString.endsWith("'")
    ? credentialsJsonString.slice(1, -1)
    : credentialsJsonString;
  credentials = JSON.parse(cleanedJsonString);
} catch (error) {
  console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", error);
  throw new Error("Invalid format for GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable. Ensure it's valid JSON content.");
}

// Create and export the Speech client instance using the parsed credentials
export const speechClient = new SpeechClient({ credentials });

// Optional: Export types if needed
// export type SpeechClientType = typeof speechClient;
