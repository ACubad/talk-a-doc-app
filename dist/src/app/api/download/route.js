import { NextResponse } from 'next/server';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Papa from 'papaparse';
import PptxGenJS from 'pptxgenjs';
export async function POST(request) {
    try {
        const body = await request.json();
        const { content, format, docType } = body;
        if (!content || !format) {
            return NextResponse.json({ error: 'Missing content or format in request body' }, { status: 400 });
        }
        let fileBuffer;
        let contentType;
        let filename;
        console.log(`Generating download for format: ${format}`);
        switch (format) {
            case 'DOCX':
                const doc = new Document({
                    sections: [{
                            properties: {},
                            children: [
                                new Paragraph({
                                    children: [new TextRun(content)],
                                }),
                            ],
                        }],
                });
                fileBuffer = await Packer.toBuffer(doc);
                contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                filename = 'generated_document.docx';
                break;
            case 'PDF':
                const pdfDoc = await PDFDocument.create();
                const page = pdfDoc.addPage();
                const { width, height } = page.getSize();
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                page.drawText(content, {
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
                // Attempt to parse content if it looks like CSV, otherwise wrap it
                let csvContent = content;
                try {
                    // Basic check if content might already be CSV-like (commas and newlines)
                    if (!content.includes(',') || !content.includes('\n')) {
                        // If not CSV-like, wrap the content in a simple structure
                        const data = [{ "Generated Content": content }];
                        csvContent = Papa.unparse(data);
                    }
                    else {
                        // Assume content might be parsable or already is CSV text
                        // We could try parsing and re-unparsing for validation, but let's keep it simple
                        csvContent = content; // Pass through potentially pre-formatted CSV
                    }
                }
                catch (parseError) {
                    console.warn("Could not auto-format to CSV, using raw content.", parseError);
                    // Fallback: treat the whole content as a single cell value if needed
                    const data = [{ "Generated Content": content }];
                    csvContent = Papa.unparse(data);
                }
                fileBuffer = Buffer.from(csvContent, 'utf-8');
                contentType = 'text/csv';
                filename = 'generated_data.csv';
                break;
            case 'PPTX':
                const pptx = new PptxGenJS();
                const slide = pptx.addSlide();
                // Simple approach: add content to a single text box
                // More complex logic could parse bullet points etc.
                slide.addText(content, { x: 0.5, y: 0.5, w: '90%', h: '90%', fontSize: 18 });
                // If docType was PowerPoint, Gemini might have provided VBA. Include as note?
                if (docType === 'PowerPoint') {
                    // Maybe add VBA as speaker notes or a separate text box if desired
                    // slide.addNotes("VBA Code:\n" + generatedVbaCode); // Example
                }
                fileBuffer = await pptx.write({ outputType: 'nodebuffer' }); // Use nodebuffer for server
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
    }
    catch (error) {
        console.error('Error in /api/download:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: `Failed to generate download: ${errorMessage}` }, { status: 500 });
    }
}
