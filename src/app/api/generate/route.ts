import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/geminiClient'; // Import the initialized Gemini client
// Removed pdf-parse import
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; // Use legacy build for Node.js
// Removed fs, path, os imports as temp file logic is removed
// Removed: import { File } from 'buffer'; - Use Web API File type

// Set workerSrc for pdfjs-dist (needed even in Node.js context for some operations)
// @ts-ignore - pdfjs types might not expect this in Node context but it's often needed
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;

// Define the expected output structure from the AI (remains the same)
const aiOutputFormatInstruction = `
First, provide a concise title (max 5 words) summarizing the main topic.
Then, provide the main generated content.
Format your response EXACTLY like this, with "---" as a separator:

TITLE: [Your concise title here]
---
CONTENT:
[Your main generated content here]
`;

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


// Helper function to convert ArrayBuffer to Buffer
function arrayBufferToBuffer(arrayBuffer: ArrayBuffer): Buffer {
    return Buffer.from(arrayBuffer);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Extract text fields
    const transcription = formData.get('transcription') as string | null;
    const docType = formData.get('docType') as string | null;
    const outputLanguage = formData.get('outputLanguage') as string | null;

    // Validate required text fields
    if (!transcription || !docType || !outputLanguage) {
      return NextResponse.json({ error: 'Missing transcription, docType, or outputLanguage in form data' }, { status: 400 });
    }

    // Extract file attachments safely
    const attachmentEntries = formData.getAll('attachments');
    const attachments = attachmentEntries.filter((entry): entry is File => entry instanceof File);

    console.log(`Received ${attachmentEntries.length} entries for 'attachments', filtered down to ${attachments.length} File objects.`);

    // --- Process Attachments ---
    const promptParts: any[] = []; // Array to hold parts for Gemini API
    let extractedTextContent = ''; // Accumulate text from documents

    for (const file of attachments) {
      // Add explicit check to ensure it's a File object before accessing properties
      if (file instanceof File) {
        console.log(`Processing attachment: ${file.name} (${file.type}, ${file.size} bytes)`);
        try {
          const fileBuffer = arrayBufferToBuffer(await file.arrayBuffer());

          if (file.type === 'application/pdf') {
            console.log(`Attempting to parse PDF: ${file.name} using pdfjs-dist`);
            try {
              const loadingTask = pdfjs.getDocument({ data: fileBuffer });
              const pdfDoc = await loadingTask.promise;
              console.log(`PDF loaded: ${pdfDoc.numPages} pages`);
              let pdfText = '';
              for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                // Ensure items is an array before calling map
                const pageText = textContent.items && Array.isArray(textContent.items)
                                  ? textContent.items.map((item: any) => item.str).join(' ')
                                  : '';
                pdfText += pageText + '\n'; // Add newline between pages
              }
              extractedTextContent += `\n\n--- Content from ${file.name} ---\n${pdfText.trim()}\n--- End ${file.name} ---`;
              console.log(`Extracted text from PDF: ${file.name}`);
            } catch (pdfError) {
               console.error(`Error parsing PDF ${file.name} with pdfjs-dist:`, pdfError);
               extractedTextContent += `\n\n--- Error parsing PDF ${file.name}: ${pdfError instanceof Error ? pdfError.message : 'Unknown PDF parsing error'} ---`;
            }
          } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedTextContent += `\n\n--- Content from ${file.name} ---\n${value}\n--- End ${file.name} ---`;
        } else if (file.type === 'text/plain') {
          extractedTextContent += `\n\n--- Content from ${file.name} ---\n${fileBuffer.toString('utf-8')}\n--- End ${file.name} ---`;
        } else if (file.type.startsWith('image/')) {
          // Add image part for Gemini
          promptParts.push({
            inlineData: {
              mimeType: file.type,
              data: fileBuffer.toString('base64'),
            },
          });
          console.log(`Added image part for ${file.name}`);
        } else {
            console.warn(`Skipping unsupported attachment type: ${file.type} (${file.name})`);
          }
        } catch (err) {
          console.error(`Error processing attachment ${file.name}:`, err);
          // Optionally add error info to extractedTextContent or ignore
          extractedTextContent += `\n\n--- Error processing ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'} ---`;
        }
      } else {
        console.warn('Skipping FormData entry that is not a File:', file);
      }
    }

    // --- Construct Final Prompt Parts ---
    // 1. Main instruction text part
    const mainPromptText = `
Generate a ${docType} in ${outputLanguage} based on the following transcription and any provided document/image context.
${aiOutputFormatInstruction}

Transcription Text:
---
${transcription}
---
${extractedTextContent}
`;
    promptParts.unshift({ text: mainPromptText }); // Add text prompt to the beginning

    console.log(`Generating content for docType: ${docType} in language: ${outputLanguage} with ${attachments.length} attachments processed.`);
    console.log(`Prompt text part length: ${mainPromptText.length}`);
    console.log(`Number of image parts: ${promptParts.length - 1}`); // -1 for the text part

    // Call the Gemini API with the structured parts
    const result = await geminiModel.generateContent({ contents: [{ role: "user", parts: promptParts }] });
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
