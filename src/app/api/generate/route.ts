import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/geminiClient'; // Import the initialized Gemini client

// Define the expected request body structure
interface GenerateRequestBody {
  transcription: string;
  docType: 'Report' | 'Email' | 'Excel' | 'PowerPoint' | string; // Allow string for flexibility
}

// Define prompts for different document types
const prompts = {
  Report: (text: string) => `Generate a formal report based on the following text:\n\n---\n${text}\n---`,
  Email: (text: string) => `Format the following text as a professional email. Infer necessary components like subject, greeting, and closing if possible:\n\n---\n${text}\n---`,
  Excel: (text: string) => `Extract structured data suitable for a CSV/Excel sheet from the following text. Present it clearly, perhaps as key-value pairs, a list of items, or a simple table structure in plain text:\n\n---\n${text}\n---`,
  PowerPoint: (text: string) => `Generate concise bullet points suitable for a PowerPoint presentation summarizing the key information in the following text:\n\n---\n${text}\n---`,
  Default: (text: string) => `Process the following text:\n\n---\n${text}\n---`,
};

export async function POST(request: Request) {
  try {
    const body: GenerateRequestBody = await request.json();
    const { transcription, docType } = body;

    if (!transcription || !docType) {
      return NextResponse.json({ error: 'Missing transcription or docType in request body' }, { status: 400 });
    }

    // Select the appropriate prompt, defaulting if docType is unexpected
    const promptGenerator = prompts[docType as keyof typeof prompts] || prompts.Default;
    const prompt = promptGenerator(transcription);

    console.log(`Generating content for docType: ${docType}`); // Server log

    // Call the Gemini API
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const generatedText = response.text();

    console.log(`Generated text length: ${generatedText.length}`); // Server log

    // Return the generated text
    return NextResponse.json({ generatedContent: generatedText });

  } catch (error) {
    console.error('Error in /api/generate:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to generate content: ${errorMessage}` }, { status: 500 });
  }
}
