import { Platform } from 'react-native';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  merchant: string;
  category: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
}

const SYSTEM_INSTRUCTION = `
You are an expert financial assistant. Parse the provided transaction details (which could be SMS text, a payment screenshot like Google Pay/PhonePe, an invoice, or a bank statement).
Extract the following information:
- Amount: The transaction monetary value (number).
- Type: "expense" if money was sent/debited, "income" if money was received/credited.
- Merchant: The person or business whom the transaction was with.
- Category: Categorize the transaction into one of these: "Food & Dining", "Transport", "Shopping", "Utilities & Bills", "Entertainment", "Health & Fitness", "Investment", "Others".
- Date: The transaction date in "YYYY-MM-DD" format. If no year is specified, default to the current year 2026.
- Time: The transaction time in "HH:MM:SS" format. If not found, default to "12:00:00".

Return a single JSON object (or JSON array of objects if parsing a statement with multiple transactions) adhering to this schema:
For single transaction:
{
  "amount": number,
  "type": "expense" | "income",
  "merchant": "string",
  "category": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM:SS"
}

For multiple transactions (like a bank statement):
{
  "transactions": [
    {
      "amount": number,
      "type": "expense" | "income",
      "merchant": "string",
      "category": "string",
      "date": "YYYY-MM-DD",
      "time": "HH:MM:SS"
    }
  ]
}

Only return raw JSON. Do not include markdown wraps or backticks.
`;

async function callGeminiAPI(parts: any[]): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to your env.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: SYSTEM_INSTRUCTION },
          ...parts
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const json = await response.json();
  const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('Empty response from Gemini API.');
  }

  return JSON.parse(textResponse.trim());
}

export async function parseSmsWithAI(smsText: string): Promise<ParsedTransaction> {
  const prompt = `Parse this SMS text: "${smsText}"`;
  const result = await callGeminiAPI([{ text: prompt }]);
  return result;
}

export async function parseImageWithAI(base64Data: string, mimeType: string): Promise<ParsedTransaction> {
  const result = await callGeminiAPI([
    { text: "Extract details from this payment transaction screenshot or invoice image." },
    {
      inlineData: {
        mimeType,
        data: base64Data
      }
    }
  ]);
  return result;
}

export async function parseStatementWithAI(statementText: string): Promise<ParsedTransaction[]> {
  const prompt = `Parse this bank statement text and extract all transactions:\n\n${statementText}`;
  const result = await callGeminiAPI([{ text: prompt }]);
  return result.transactions || [];
}
