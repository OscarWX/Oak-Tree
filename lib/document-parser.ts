import { createReadStream, readFileSync } from 'fs';
import { join } from 'path';
// Use internal implementation directly to avoid debug code in pdf-parse index.
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Extracts text from a PDF file
 */
export async function extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extracts text from a Word document (DOC/DOCX)
 */
export async function extractTextFromWord(fileBuffer: Buffer): Promise<string> {
  try {
    // Save buffer to temp file (mammoth requires a file path)
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `word-doc-${Date.now()}.docx`);
    
    fs.writeFileSync(tempFilePath, fileBuffer);
    
    const result = await mammoth.extractRawText({
      path: tempFilePath
    });
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    return result.value || '';
  } catch (error) {
    console.error('Error extracting text from Word document:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

/**
 * Extracts text from a plain text file
 */
export function extractTextFromTxt(fileBuffer: Buffer): string {
  return fileBuffer.toString('utf-8');
}

/**
 * Determines file type based on mime type or file extension
 */
export function getFileType(fileName: string, mimeType?: string): 'pdf' | 'word' | 'text' | 'unsupported' {
  const extension = path.extname(fileName).toLowerCase();
  
  if (mimeType) {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'application/msword' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'word';
    }
    if (mimeType === 'text/plain') return 'text';
  }
  
  // Fallback to extension check
  if (extension === '.pdf') return 'pdf';
  if (extension === '.doc' || extension === '.docx') return 'word';
  if (extension === '.txt') return 'text';
  
  return 'unsupported';
}

/**
 * Main function to extract text from a file
 */
export async function extractTextFromFile(
  fileBuffer: Buffer, 
  fileName: string,
  mimeType?: string
): Promise<string> {
  const fileType = getFileType(fileName, mimeType);
  
  switch (fileType) {
    case 'pdf':
      return extractTextFromPdf(fileBuffer);
    case 'word':
      return extractTextFromWord(fileBuffer);
    case 'text':
      return extractTextFromTxt(fileBuffer);
    default:
      throw new Error(`Unsupported file type: ${fileName}`);
  }
}

/**
 * Function to handle Supabase file extraction
 * Downloads file from URL and extracts text
 */
export async function extractTextFromURL(fileUrl: string, fileName: string): Promise<string> {
  try {
    console.log(`Fetching file from: ${fileUrl}`);
    
    // Fetch the file
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      console.error(`Failed fetch response: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    // Check content type to make sure we're not getting HTML
    const contentType = response.headers.get('content-type') || '';
    console.log(`Response content type: ${contentType}`);
    
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      // Log the first part of the response to see what's happening
      const text = await response.text();
      console.error(`Received unexpected content type: ${contentType}`);
      console.error(`Response preview: ${text.substring(0, 200)}...`);
      throw new Error(`Received HTML/JSON instead of file: ${contentType}`);
    }
    
    // Get the file as an array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Check if we actually got content
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Received empty file');
    }
    
    console.log(`Received file, size: ${arrayBuffer.byteLength} bytes`);
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text based on file type
    return extractTextFromFile(buffer, fileName, contentType);
  } catch (error: any) {
    console.error('Error extracting text from URL:', error);
    throw new Error(`Failed to extract text from file URL: ${error.message || 'Unknown error'}`);
  }
} 