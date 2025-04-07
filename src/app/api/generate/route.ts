import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/geminiClient'; // Import the initialized Gemini client

// Define the expected request body structure
interface GenerateRequestBody {
  transcription: string;
  docType: 'Report' | 'Email' | 'Excel' | 'PowerPoint' | string;
  outputLanguage: string; // Added output language
}

// Define prompts for different document types, requesting HTML output
const prompts = {
  Report: (text: string, language: string) => `Generate a comprehensive and detailed formal report in ${language} based on the following text. Ensure the report covers all key aspects mentioned. Use simple HTML tags for formatting (like <b> for bold, <i> for italic, <p> for paragraphs, <ul> and <li> for lists). Do NOT use Markdown syntax like ** or *:\n\n---\n${text}\n---`,
  Email: (text: string, language: string) => `Format the following text as a comprehensive and professional email in ${language}. Ensure all relevant points are included and elaborated upon where appropriate. Infer necessary components like subject, greeting, and closing if possible. Use simple HTML tags for formatting (like <b> for bold, <i> for italic, <p> for paragraphs). Do NOT use Markdown syntax like ** or *:\n\n---\n${text}\n---`,
  // Excel/CSV should remain plain text, but specify language for content extraction context
  Excel: (text: string, language: string) => `Extract comprehensive structured data suitable for a CSV/Excel sheet from the following text (which is in ${language}). Ensure all relevant data points are captured. Present it clearly as plain text, perhaps as key-value pairs, a list of items, or a simple table structure. Do NOT use HTML or Markdown:\n\n---\n${text}\n---`,
  // PowerPoint should be concise points, specify language
  PowerPoint: (text: string, language: string) => `Generate comprehensive and detailed bullet points in ${language} suitable for a PowerPoint presentation, summarizing all key information and supporting details from the following text. Use simple HTML tags for formatting if necessary (<b>, <i>). Do NOT use Markdown syntax like ** or *:\n\n---\n${text}\n---`,
  Default: (text: string, language: string) => `Process the following text (in ${language}) comprehensively. Use simple HTML tags for formatting if appropriate. Do NOT use Markdown syntax like ** or *:\n\n---\n${text}\n---`,
};

export async function POST(request: Request) {
  try {
    const body: GenerateRequestBody = await request.json();
    // Extract outputLanguage
    const { transcription, docType, outputLanguage } = body;

    // Add outputLanguage to validation
    if (!transcription || !docType || !outputLanguage) {
      return NextResponse.json({ error: 'Missing transcription, docType, or outputLanguage in request body' }, { status: 400 });
    }

    // Select the appropriate prompt, defaulting if docType is unexpected
    const promptGenerator = prompts[docType as keyof typeof prompts] || prompts.Default;
    // Call prompt generator with both arguments
    const prompt = promptGenerator(transcription, outputLanguage);

    console.log(`Generating content for docType: ${docType} in language: ${outputLanguage}`); // Server log

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
