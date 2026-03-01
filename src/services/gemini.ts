import { GoogleGenAI, Type } from "@google/genai";

export interface HiddenCharge {
  name: string;
  amount: number;
  type: 'upfront' | 'recurring' | 'event-based';
  description: string;
  pageNumber: number;
}

export interface OtherLoan {
  type: string;
  balance: number;
  emi: number;
  interestRate: number;
}

export interface LoanMetadata {
  principal: number;
  currentOutstanding: number;
  emiAmount: number;
  statedRoi: number;
  remainingTenure: number;
  foreclosurePenaltyPct: number;
  processingFee: number;
  legalValuationCharges: number;
  stampDutyPct: number;
  salary: number;
  cibilScore: number;
  otherLoans: OtherLoan[];
  hiddenCharges: HiddenCharge[];
  sourcePages: { [key: string]: number }; // Map of field name to page number
  confidenceScore: number; // 0 to 1
}

const LOAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    principal: { type: Type.NUMBER, description: "Sanctioned Principal amount" },
    currentOutstanding: { type: Type.NUMBER, description: "Current Outstanding balance" },
    emiAmount: { type: Type.NUMBER, description: "Monthly EMI amount" },
    statedRoi: { type: Type.NUMBER, description: "Stated Rate of Interest (ROI) in percentage" },
    remainingTenure: { type: Type.INTEGER, description: "Remaining Tenure in months" },
    foreclosurePenaltyPct: { type: Type.NUMBER, description: "Foreclosure Penalty or Prepayment Charge percentage (often 2-4%). If mentioned as 'Nil', return 0." },
    processingFee: { type: Type.NUMBER, description: "Upfront processing fee or documentation charges" },
    legalValuationCharges: { type: Type.NUMBER, description: "Legal and Valuation charges for the new loan" },
    stampDutyPct: { type: Type.NUMBER, description: "MODT / Stamp Duty percentage for the new loan" },
    salary: { type: Type.NUMBER, description: "Monthly take-home salary of the user" },
    cibilScore: { type: Type.INTEGER, description: "Estimated CIBIL score of the user" },
    otherLoans: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Type of loan (e.g. Credit Card, Personal Loan)" },
          balance: { type: Type.NUMBER, description: "Outstanding balance" },
          emi: { type: Type.NUMBER, description: "Monthly EMI" },
          interestRate: { type: Type.NUMBER, description: "Current interest rate (APR)" }
        },
        required: ["type", "balance", "emi", "interestRate"]
      },
      description: "Other existing loans or credit card debts found in the document"
    },
    hiddenCharges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the charge (e.g. Annual Maintenance, Insurance)" },
          amount: { type: Type.NUMBER, description: "Amount of the charge" },
          type: { type: Type.STRING, enum: ["upfront", "recurring", "event-based"], description: "When the charge is applied" },
          description: { type: Type.STRING, description: "Brief explanation of the charge" },
          pageNumber: { type: Type.INTEGER, description: "Page number where this charge was found" }
        },
        required: ["name", "amount", "type", "description", "pageNumber"]
      },
      description: "Any hidden or additional charges found in the fine print"
    },
    sourcePages: {
      type: Type.OBJECT,
      properties: {
        principal: { type: Type.INTEGER },
        currentOutstanding: { type: Type.INTEGER },
        emiAmount: { type: Type.INTEGER },
        statedRoi: { type: Type.INTEGER },
        remainingTenure: { type: Type.INTEGER },
        foreclosurePenaltyPct: { type: Type.INTEGER },
        processingFee: { type: Type.INTEGER }
      },
      required: ["principal", "currentOutstanding", "emiAmount", "statedRoi", "remainingTenure", "foreclosurePenaltyPct", "processingFee"],
      description: "The page number from which each primary value was extracted"
    },
    confidenceScore: { type: Type.NUMBER, description: "Confidence score of the extraction between 0 and 1" }
  },
  required: ["principal", "currentOutstanding", "emiAmount", "statedRoi", "remainingTenure", "foreclosurePenaltyPct", "processingFee", "legalValuationCharges", "stampDutyPct", "salary", "cibilScore", "otherLoans", "hiddenCharges", "sourcePages", "confidenceScore"]
};

export async function extractLoanMetadata(pdfText: string): Promise<LoanMetadata> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenAI({ apiKey });
  
  // 1. Clean the text
  const cleanedText = pdfText
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Forensic Search: Instead of simple truncation, we look for "hot zones"
  // We prioritize sections containing keywords related to money and charges.
  const keywords = ["charge", "fee", "penalty", "gst", "insurance", "maintenance", "schedule", "roi", "emi", "outstanding", "foreclosure", "prepayment", "pre-payment", "closure", "lock-in", "pre-closure"];
  const relevantChunks: string[] = [];
  
  // Always include the first 15k and last 10k
  relevantChunks.push(cleanedText.substring(0, 15000));
  
  // Search for keyword-rich areas in the middle
  const middleText = cleanedText.substring(15000, cleanedText.length - 10000);
  if (middleText.length > 0) {
    keywords.forEach(kw => {
      const index = middleText.toLowerCase().indexOf(kw);
      if (index !== -1) {
        // Take 1000 characters around the keyword
        const start = Math.max(0, index - 500);
        const end = Math.min(middleText.length, index + 500);
        relevantChunks.push(`[CONTEXT: ${kw}] ${middleText.substring(start, end)}`);
      }
    });
  }
  
  relevantChunks.push(cleanedText.substring(cleanedText.length - 10000));
  
  // Combine unique chunks (up to a safe limit)
  const processedText = Array.from(new Set(relevantChunks)).join("\n---\n").substring(0, 60000);

  const response = await genAI.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are a Forensic Chartered Accountant. Your mission is to find EVERY hidden cost in this loan document.
    
    Look for:
    1. Annual Maintenance Fees
    2. Mandatory Insurance Premiums
    3. Document Retrieval Charges
    4. Statement Charges
    5. GST (18%) on every component (Processing Fees, Penalties, etc.)
    6. Hidden ROI compounding rules
    7. Legal/Valuation charges (usually ₹3k-7k)
    8. MODT/Stamp Duty (usually 0.2%-0.5%)
    9. Monthly Salary/Income
    10. Mention of CIBIL score
    11. Other active loans or credit card dues mentioned in the statement summary
    12. Foreclosure Penalty or Prepayment Charges (CRITICAL: Look for terms like 'Pre-payment', 'Foreclosure', 'Closure charges')
    
    The text contains page markers like [PAGE X]. You MUST identify and return the exact page number for every value you extract.
    
    Text: ${processedText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: LOAN_SCHEMA,
      systemInstruction: "You are a Senior Indian Chartered Accountant specializing in forensic debt auditing. You are highly skeptical of bank 'stated' rates. You must find the 'Actual Truth' by digging into the fine print. In India, Processing Fees and Foreclosure Penalties attract 18% GST; ensure you check if the document mentions this. ALWAYS provide the page numbers for your findings to ensure auditability."
    }
  });

  try {
    let text = response.text;
    console.log("Gemini raw response:", text);
    if (!text) throw new Error("Gemini returned empty response");
    
    // Clean markdown if present
    text = text.replace(/```json\n?|```/g, "").trim();
    
    return JSON.parse(text) as LoanMetadata;
  } catch (e: any) {
    console.error("Failed to parse Gemini response", e);
    throw new Error(`Failed to extract data from document: ${e.message}`);
  }
}
