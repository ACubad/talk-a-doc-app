// Basic type declaration for the mammoth functions we use
declare module 'mammoth' {
  interface MammothOptions {
    buffer: Buffer;
  }
  interface MammothResult {
    value: string; // The extracted text
    messages: any[]; // Any messages generated during extraction
  }
  function extractRawText(options: MammothOptions): Promise<MammothResult>;
}
