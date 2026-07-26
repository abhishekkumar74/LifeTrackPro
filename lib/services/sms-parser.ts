import { ParsedTransaction, parseSmsWithAI } from './gemini-parser';

export async function parseSmsText(smsBody: string): Promise<ParsedTransaction> {
  const cleanBody = smsBody.trim();

  // Try local regex patterns first (HDFC, SBI, ICICI, Paytm UPI, etc.)
  const parsed = tryLocalRegexParse(cleanBody);
  if (parsed) {
    return parsed;
  }

  // Fallback to Gemini AI
  try {
    return await parseSmsWithAI(cleanBody);
  } catch (e) {
    console.error('Gemini SMS parsing failed, using generic manual fallback:', e);
    // Generic emergency parser
    return {
      amount: extractFirstNumber(cleanBody) || 0,
      type: detectTransactionType(cleanBody),
      merchant: detectMerchant(cleanBody),
      category: 'Others',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0]
    };
  }
}

function tryLocalRegexParse(text: string): ParsedTransaction | null {
  // Common Indian Bank SMS Patterns
  // 1. Debited: e.g. "Rs 500 debited from A/c..." or "spent Rs.500 at..."
  // 2. Credited: e.g. "Rs 1,000 credited to A/c..."
  
  const lowerText = text.toLowerCase();
  
  // Detect amount
  let amount = 0;
  // Match "rs. 500", "rs 500", "inr 500", "rs.500", "rs500"
  const amountMatch = text.match(/(?:rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  } else {
    return null; // Can't resolve amount locally
  }

  // Detect Type
  const isDebit = lowerText.includes('debited') || lowerText.includes('spent') || lowerText.includes('sent') || lowerText.includes('paid');
  const isCredit = lowerText.includes('credited') || lowerText.includes('received') || lowerText.includes('added');
  
  let type: 'income' | 'expense' = 'expense';
  if (isCredit && !isDebit) {
    type = 'income';
  } else if (!isDebit && !isCredit) {
    return null; // Ambiguous transaction type
  }

  // Detect Merchant (e.g. "to XYZ", "at XYZ")
  let merchant = 'Unknown Merchant';
  const merchantMatch = text.match(/(?:to|at|info)\s+([A-Za-z0-9\s*#]{3,20})(?:\s+on|\s+Ref|\s+Bal|\.|$)/i);
  if (merchantMatch) {
    merchant = merchantMatch[1].trim();
  }

  // Categories mapping based on simple keywords
  let category = 'Others';
  if (lowerText.includes('uber') || lowerText.includes('ola') || lowerText.includes('metro') || lowerText.includes('petrol') || lowerText.includes('fuel')) {
    category = 'Transport';
  } else if (lowerText.includes('zomato') || lowerText.includes('swiggy') || lowerText.includes('starbucks') || lowerText.includes('restaur') || lowerText.includes('cafe')) {
    category = 'Food & Dining';
  } else if (lowerText.includes('netflix') || lowerText.includes('spotify') || lowerText.includes('prime') || lowerText.includes('movie') || lowerText.includes('bookmyshow')) {
    category = 'Entertainment';
  } else if (lowerText.includes('bill') || lowerText.includes('recharge') || lowerText.includes('electricity') || lowerText.includes('wifi') || lowerText.includes('broadband')) {
    category = 'Utilities & Bills';
  } else if (lowerText.includes('amazon') || lowerText.includes('flipkart') || lowerText.includes('myntra') || lowerText.includes('mall') || lowerText.includes('grocery')) {
    category = 'Shopping';
  }

  // Extract Date/Time
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().split(' ')[0];

  return {
    amount,
    type,
    merchant,
    category,
    date: today,
    time: nowTime
  };
}

function extractFirstNumber(text: string): number | null {
  const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function detectTransactionType(text: string): 'income' | 'expense' {
  const lower = text.toLowerCase();
  if (lower.includes('credited') || lower.includes('received') || lower.includes('added')) {
    return 'income';
  }
  return 'expense';
}

function detectMerchant(text: string): string {
  const match = text.match(/(?:to|at)\s+([A-Za-z0-9\s]{3,15})/i);
  return match ? match[1].trim() : 'Unknown';
}
