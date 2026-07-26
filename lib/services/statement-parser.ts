import { ParsedTransaction, parseImageWithAI, parseStatementWithAI } from './gemini-parser';
import * as FileSystem from 'expo-file-system';

function base64ToBinaryString(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }
  
  let p = 0;
  let result = '';
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];
    
    const bytes = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    const b1 = (bytes >> 16) & 255;
    const b2 = (bytes >> 8) & 255;
    const b3 = bytes & 255;
    
    result += String.fromCharCode(b1);
    if (p + 1 < bufferLength) result += String.fromCharCode(b2);
    if (p + 2 < bufferLength) result += String.fromCharCode(b3);
    p += 3;
  }
  return result;
}

export async function isPdfEncrypted(base64Data: string): Promise<boolean> {
  try {
    // Check first 5000 characters of base64
    const header = base64Data.substring(0, 3000);
    const decoded = base64ToBinaryString(header);
    return decoded.includes('/Encrypt');
  } catch (e) {
    console.error('Error checking PDF encryption:', e);
    return false;
  }
}

export async function parseStatementFile(fileUri: string): Promise<ParsedTransaction[]> {
  try {
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });

    const isPdf = fileUri.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      const encrypted = await isPdfEncrypted(base64Data);
      if (encrypted) {
        throw new Error('PASSWORD_PROTECTED');
      }

      // Send unencrypted PDF directly to Gemini Flash for parsing!
      const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured.');
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const requestBody = {
        contents: [
          {
            parts: [
              { text: "Extract all transactions from this bank statement PDF. Return a JSON object containing a 'transactions' array of objects matching the schema: { amount: number, type: 'income' | 'expense', merchant: 'string', category: 'string', date: 'YYYY-MM-DD', time: 'HH:MM:SS' }" },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Gemini PDF parse failed with status: ${response.status}`);
      }

      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Empty text returned from PDF statement parser.');
      }

      const result = JSON.parse(text.trim());
      return result.transactions || [];
    } else {
      // It's a CSV or text file, read as plain text and parse
      const plainText = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'utf8',
      });
      return await parseStatementWithAI(plainText);
    }
  } catch (e) {
    console.error('Failed to parse statement file:', e);
    throw e;
  }
}

export async function parseInvoiceImage(fileUri: string, mimeType: string): Promise<ParsedTransaction> {
  try {
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });
    return await parseImageWithAI(base64Data, mimeType);
  } catch (e) {
    console.error('Failed to parse invoice image:', e);
    throw e;
  }
}
