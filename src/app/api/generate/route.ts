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

// Define the expected output structure from the AI
const aiOutputFormatInstruction = `
First, provide a concise title (max 5 words) summarizing the main topic.
Then, provide the main generated content.
Format your response EXACTLY like this, with "---" as a separator:

TITLE: [Your concise title here]
---
CONTENT:
[Your main generated content here]
`;

// Update prompts to request title and content in the specified format
const prompts = {
  Report: (text: string, language: string, attachments?: AttachmentInfo[]) => `Generate a comprehensive and detailed formal report in ${language} based on the following text. Consider the context provided by the list of attached files. Ensure the report covers all key aspects mentioned. Use simple HTML tags for formatting (like <b> for bold, <i> for italic, <p> for paragraphs, <ul> and <li> for lists). Do NOT use Markdown syntax like ** or *. ${aiOutputFormatInstruction}\n\nTranscription Text:\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
  Email: (text: string, language: string, attachments?: AttachmentInfo[]) => `Format the following text as a comprehensive and professional email in ${language}. Consider the context provided by the list of attached files. Ensure all relevant points are included and elaborated upon where appropriate. Infer necessary components like subject, greeting, and closing if possible. Use simple HTML tags for formatting (like <b> for bold, <i> for italic, <p> for paragraphs). Do NOT use Markdown syntax like ** or *. ${aiOutputFormatInstruction}\n\nTranscription Text:\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
  Excel: (text: string, language: string, attachments?: AttachmentInfo[]) => `Extract comprehensive structured data suitable for a CSV/Excel sheet from the following text (which is in ${language}). Consider the context provided by the list of attached files. Ensure all relevant data points are captured. Present it clearly as plain text, perhaps as key-value pairs, a list of items, or a simple table structure. Do NOT use HTML or Markdown. ${aiOutputFormatInstruction}\n\nTranscription Text:\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
  PowerPoint: (text: string, language: string, attachments?: AttachmentInfo[]) => `Generate comprehensive and detailed bullet points in ${language} suitable for a PowerPoint presentation, summarizing all key information and supporting details from the following text. Consider the context provided by the list of attached files. Use simple HTML tags for formatting if necessary (<b>, <i>). Do NOT use Markdown syntax like ** or *. ${aiOutputFormatInstruction}\n\nTranscription Text:\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
  Default: (text: string, language: string, attachments?: AttachmentInfo[]) => `Process the following text (in ${language}) comprehensively. Consider the context provided by the list of attached files. Use simple HTML tags for formatting if appropriate. Do NOT use Markdown syntax like ** or *. ${aiOutputFormatInstruction}\n\nTranscription Text:\n---\n${text}\n---${formatAttachmentsForPrompt(attachments)}`,
};

// Helper function to parse the AI's structured response
const parseAIResponse = (responseText: string): { title: string; content: string } => {
  const titleMatch = responseText.match(/^TITLE:\s*(.*?)\s*$/m);
  const contentMatch = responseText.match(/---\s*CONTENT:\s*([\s\S]*)$/m);

  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Document'; // Default title if parsing fails
  const content = contentMatch ? contentMatch[1].trim() : responseText; // Default to full text if parsing fails

  // Basic check if title looks like the content separator was missed
  if (title.includes('---') && content === responseText) {
      return { title: 'Untitled Document', content: responseText };
  }

  return { title, content };
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
    const rawGeneratedText = response.text();

    console.log(`Raw generated text length: ${rawGeneratedText.length}`); // Server log

    // Parse the response to separate title and content
    const { title: generatedTitle, content: generatedContent } = parseAIResponse(rawGeneratedText);

    console.log(`Parsed Title: ${generatedTitle}`);
    console.log(`Parsed Content Length: ${generatedContent.length}`);

    // Return both the generated title and content
    return NextResponse.json({ generatedTitle, generatedContent });

  } catch (error) {
    console.error('Error in /api/generate:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to generate content: ${errorMessage}` }, { status: 500 });
  }
}
