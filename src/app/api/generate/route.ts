import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/geminiClient'; // Import the initialized Gemini client

// Define the expected request body structure
// Define attachment structure
interface AttachmentInfo {
  name: string;
  type: string;
  // We might add size or other info later
}

// Update request body structure
interface GenerateRequestBody {
  transcription: string;
  docType: 'Report' | 'Email' | 'Excel' | 'PowerPoint' | string;
  outputLanguage: string;
  attachments?: AttachmentInfo[]; // Optional array of attachment info
}

// Helper function to format attachment info for the prompt
const formatAttachmentsForPrompt = (attachments?: AttachmentInfo[]): string => {
  if (!attachments || attachments.length === 0) {
    return '';
  }
  const fileList = attachments.map(att => `- ${att.name} (${att.type})`).join('\n');
  return `\n\nAttached Files (for context, content not included):\n${fileList}\n---`;
};

// Update prompts to accept and use attachments
const prompts = {
  Report: (text: string, language: string, attachments?: AttachmentInfo[]) => `Generate a comprehensive and detailed formal report in ${language} based on the following text. Consider the context provided by the list of attached files. Ensure the report covers all key aspects mentioned. Use simple HTML tags for formatting (like <b> for bold, <i> for italic, <p> for paragraphs, <ul> and <li> for lists). Do NOT use Markdown syntax like ** or *:\n\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
  Email: (text: string, language: string, attachments?: AttachmentInfo[]) => `Format the following text as a comprehensive and professional email in ${language}. Consider the context provided by the list of attached files. Ensure all relevant points are included and elaborated upon where appropriate. Infer necessary components like subject, greeting, and closing if possible. Use simple HTML tags for formatting (like <b> for bold, <i> for italic, <p> for paragraphs). Do NOT use Markdown syntax like ** or *:\n\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
  Excel: (text: string, language: string, attachments?: AttachmentInfo[]) => `Extract comprehensive structured data suitable for a CSV/Excel sheet from the following text (which is in ${language}). Consider the context provided by the list of attached files. Ensure all relevant data points are captured. Present it clearly as plain text, perhaps as key-value pairs, a list of items, or a simple table structure. Do NOT use HTML or Markdown:\n\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
  PowerPoint: (text: string, language: string, attachments?: AttachmentInfo[]) => `Generate comprehensive and detailed bullet points in ${language} suitable for a PowerPoint presentation, summarizing all key information and supporting details from the following text. Consider the context provided by the list of attached files. Use simple HTML tags for formatting if necessary (<b>, <i>). Do NOT use Markdown syntax like ** or *:\n\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
  Default: (text: string, language: string, attachments?: AttachmentInfo[]) => `Process the following text (in ${language}) comprehensively. Consider the context provided by the list of attached files. Use simple HTML tags for formatting if appropriate. Do NOT use Markdown syntax like ** or *:\n\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
};

export async function POST(request: Request) {
  try {
    const body: GenerateRequestBody = await request.json();
    // Extract transcription, docType, outputLanguage, and attachments
    const { transcription, docType, outputLanguage, attachments } = body;

    // Validate required fields
    if (!transcription || !docType || !outputLanguage) {
      return NextResponse.json({ error: 'Missing transcription, docType, or outputLanguage in request body' }, { status: 400 });
    }

    // Select the appropriate prompt generator
    const promptGenerator = prompts[docType as keyof typeof prompts] || prompts.Default;
    // Call prompt generator with transcription, language, and attachments
    const prompt = promptGenerator(transcription, outputLanguage, attachments);

    console.log(`Generating content for docType: ${docType} in language: ${outputLanguage} with ${attachments?.length || 0} attachments.`); // Updated log

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
