import { GoogleGenerativeAI } from '@google/generative-ai';

// Ensure environment variable is set
const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  throw new Error("Missing environment variable: GOOGLE_AI_API_KEY");
}

// Initialize the GoogleGenerativeAI client
const genAI = new GoogleGenerativeAI(apiKey);

// Export the client instance for the specific model we plan to use (Gemini 1.5 Pro)
// Note: Ensure the model name 'gemini-1.5-pro-latest' is correct based on availability.
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

// You could also export the main client if needed for other operations
// export { genAI };
