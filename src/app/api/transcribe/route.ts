import { NextRequest, NextResponse } from 'next/server';
import { geminiModel } from '../../../lib/geminiClient'; // Corrected import path
import { Readable } from 'stream';
import { GoogleGenerativeAIError } from '@google/generative-ai'; // Import error type if needed for specific handling

// Helper function to convert Blob stream to Buffer (keep this)
async function streamToBuffer(readableStream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = readableStream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
  // No need to check speechClient anymore

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const languageCode = formData.get('languageCode') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }
    if (!languageCode) {
      return NextResponse.json({ error: 'No language code provided.' }, { status: 400 });
    }

    console.log(`Received audio file for transcription. Size: ${audioFile.size}, Type: ${audioFile.type}, Lang: ${languageCode}`);

    // Convert Blob stream to Buffer
    const audioBuffer = await streamToBuffer(audioFile.stream());

    // Convert audio buffer to base64
    const audioBase64 = audioBuffer.toString('base64');

    // Prepare the prompt and audio data for Gemini
    const audioPart = {
      inlineData: {
        mimeType: audioFile.type, // Use the actual MIME type from the uploaded file
        data: audioBase64,
      },
    };

    // Simple prompt for transcription
    const textPart = { text: `Transcribe the following audio in ${languageCode}:` }; // Include language hint

    // Send the request to Gemini API
    console.log(`Sending audio (type: ${audioFile.type}, lang: ${languageCode}) to Gemini API...`);
    const result = await geminiModel.generateContent([textPart, audioPart]); // Send both parts
    const response = result.response;
    const transcription = response.text(); // Get the transcribed text
    console.log('Received response from Gemini API.');

    if (typeof transcription !== 'string') {
        console.log('No transcription text received from Gemini API or unexpected format.');
        // Handle cases where Gemini might not return text (e.g., safety settings, empty audio)
        return NextResponse.json({ transcription: '' }); // Return empty string for consistency
    }

    console.log('Transcription successful via Gemini.');
    return NextResponse.json({ transcription: transcription });

  } catch (error) {
    console.error('Error during Gemini transcription API request:', error);
    // Handle potential Gemini-specific errors (e.g., safety blocks)
    if (error instanceof GoogleGenerativeAIError) {
        // You might want to inspect error.message or specific properties
        return NextResponse.json({ error: `Gemini API Error: ${error.message}` }, { status: 500 });
    }
    // Generic error
    return NextResponse.json({ error: `Transcription failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
