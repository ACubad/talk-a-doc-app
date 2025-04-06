import { NextResponse } from 'next/server';
import { Packer, Document, Paragraph, TextRun, IRunOptions, IParagraphOptions, Table, ParagraphChild } from 'docx'; // Import ParagraphChild
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib'; // Use PDFFont if needed, remove direct Font import
import Papa from 'papaparse';
import PptxGenJS from 'pptxgenjs';
import * as htmlparser2 from 'htmlparser2'; // Import htmlparser2

// Define the expected request body structure
interface DownloadRequestBody {
  content: string; // The generated HTML content from Gemini
  format: 'DOCX' | 'PDF' | 'CSV' | 'PPTX' | string;
  docType: 'Report' | 'Email' | 'Excel' | 'PowerPoint' | string; // To help format PPTX
}

// Helper function to convert simple HTML to DOCX Paragraphs
function htmlToDocxChildren(html: string): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = []; // Allow Table for future expansion
  let currentParagraphOptions: IParagraphOptions = {};
  let currentTextRuns: ParagraphChild[] = []; // Use ParagraphChild which includes TextRun
  let isBold = false;
  let isItalic = false;
  let listLevel = 0;

  const parser = new htmlparser2.Parser({
    onopentag(name) {
      if (name === 'p') {
        // Finalize the previous paragraph before starting a new one
        if (currentTextRuns.length > 0) {
          children.push(new Paragraph({ ...currentParagraphOptions, children: currentTextRuns }));
        }
        currentTextRuns = [];
        currentParagraphOptions = {}; // Reset options for the new paragraph
      } else if (name === 'b' || name === 'strong') {
        isBold = true;
      } else if (name === 'i' || name === 'em') {
        isItalic = true; // Corrected property name is 'italics' for TextRun
      } else if (name === 'ul' || name === 'ol') {
        listLevel++;
      } else if (name === 'li') {
        // Finalize previous paragraph/list item
        if (currentTextRuns.length > 0) {
          children.push(new Paragraph({ ...currentParagraphOptions, children: currentTextRuns }));
        }
        currentTextRuns = [];
        // Set options for the list item paragraph
        currentParagraphOptions = { bullet: { level: listLevel - 1 } };
      } else if (name === 'br') {
        // Add a line break TextRun
        currentTextRuns.push(new TextRun({ break: 1 }));
      }
    },
    ontext(text) {
      const processedText = text.replace(/\s+/g, ' '); // Collapse whitespace
      if (processedText) {
        // Define options directly in the constructor
        const runOptions: IRunOptions = {
          text: processedText,
          ...(isBold && { bold: true }), // Conditionally add bold
          ...(isItalic && { italics: true }), // Conditionally add italics
        };
        currentTextRuns.push(new TextRun(runOptions));
      }
    },
    onclosetag(name) {
      if (name === 'p' || name === 'li') {
        // Finalize the current paragraph/list item
        if (currentTextRuns.length > 0) {
          children.push(new Paragraph({ ...currentParagraphOptions, children: currentTextRuns }));
        }
        currentTextRuns = [];
        currentParagraphOptions = {}; // Reset options
      } else if (name === 'b' || name === 'strong') {
        isBold = false;
      } else if (name === 'i' || name === 'em') {
        isItalic = false;
      } else if (name === 'ul' || name === 'ol') {
        listLevel = Math.max(0, listLevel - 1);
      }
    },
    onend() {
      // Add any remaining text runs as a final paragraph
      if (currentTextRuns.length > 0) {
        children.push(new Paragraph({ ...currentParagraphOptions, children: currentTextRuns }));
      }
    }
  }, { decodeEntities: true });

  parser.write(html);
  parser.end();

  // Handle case where input HTML might be plain text without tags
  if (children.length === 0 && html.trim() && !html.includes('<')) {
    children.push(new Paragraph({ children: [new TextRun(html.trim())] }));
  }


  return children;
}

// Basic HTML stripper
function stripHtml(html: string): string {
    // Replace <br> tags with newlines, then strip all other tags
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
}


export async function POST(request: Request) {
  try {
    const body: DownloadRequestBody = await request.json();
    const { content, format, docType } = body; // content is now HTML

    if (!content || !format) {
      return NextResponse.json({ error: 'Missing content or format in request body' }, { status: 400 });
    }

    let fileBuffer: Buffer | Uint8Array;
    let contentType: string;
    let filename: string;

    console.log(`Generating download for format: ${format}`);

    switch (format) {
      case 'DOCX':
        const docxChildren = htmlToDocxChildren(content);
        const doc = new Document({
          sections: [{
            properties: {},
            children: docxChildren, // Use parsed children
          }],
        });
        fileBuffer = await Packer.toBuffer(doc);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename = 'generated_document.docx';
        break;

      case 'PDF':
        // --- Basic PDF implementation (strips HTML for now) ---
        // TODO: Implement proper HTML to PDF conversion later
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const plainTextPdf = stripHtml(content); // Strip HTML for basic PDF
        page.drawText(plainTextPdf, {
          x: 50,
          y: height - 50,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
          maxWidth: width - 100,
          lineHeight: 14,
        });
        fileBuffer = await pdfDoc.save();
        contentType = 'application/pdf';
        filename = 'generated_document.pdf';
        break;

      case 'CSV':
        // Strip HTML before attempting to parse/generate CSV
        const plainTextCsv = stripHtml(content);
        let csvContent = plainTextCsv;
        try {
            // Basic check if content might already be CSV-like
            // Let's assume Gemini provides decent structure for Excel/CSV prompt
            // If not, wrap the whole thing.
            if (docType === 'Excel' && plainTextCsv.includes(',')) {
                 csvContent = plainTextCsv; // Pass through potentially pre-formatted CSV
            } else {
                 // Wrap non-CSV-like content or content from other docTypes
                 const data = [{ "Generated Content": plainTextCsv }];
                 csvContent = Papa.unparse(data);
            }
        } catch (parseError) {
             console.warn("Could not auto-format to CSV, using raw stripped content.", parseError);
             const data = [{ "Generated Content": plainTextCsv }];
             csvContent = Papa.unparse(data);
        }
        fileBuffer = Buffer.from(csvContent, 'utf-8');
        contentType = 'text/csv';
        filename = 'generated_data.csv';
        break;

      case 'PPTX':
         // --- Basic PPTX implementation (strips HTML for now) ---
         // TODO: Implement proper HTML to PPTX conversion later using htmlparser2
         // For now, just strip tags like PDF
        const pptx = new PptxGenJS();
        const slide = pptx.addSlide();
        const plainTextPptx = stripHtml(content); // Strip HTML for basic PPTX
        slide.addText(plainTextPptx, { x: 0.5, y: 0.5, w: '90%', h: '90%', fontSize: 18 });

        fileBuffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        filename = 'generated_presentation.pptx';
        break;

      default:
        return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 });
    }

    // Return the file buffer with appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(fileBuffer, { status: 200, headers });

  } catch (error) {
    console.error('Error in /api/download:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to generate download: ${errorMessage}` }, { status: 500 });
  }
}
