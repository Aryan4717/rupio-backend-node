/**
 * CSV Bank Statement Parser Service
 * 
 * Parses uploaded CSV bank statements and normalizes into transactions schema.
 * 
 * Supported CSV Formats:
 * - Standard format: Date, Description, Debit, Credit, Balance
 * - HDFC format: Date, Narration, Chq./Ref.No., Value Dt, Withdrawal Amt., Deposit Amt., Closing Balance
 * - ICICI format: Transaction Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance
 * - SBI format: Txn Date, Value Date, Description, Ref No, Debit, Credit, Balance
 */

const { categorizeTransaction, extractMerchant } = require('./aaDataParser');

// CSV column mappings for different bank formats
const BANK_FORMATS = {
  standard: {
    date: ['date', 'transaction date', 'txn date', 'trans date'],
    narration: ['description', 'narration', 'particulars', 'remarks', 'details'],
    debit: ['debit', 'withdrawal', 'withdrawal amt', 'withdrawal amt.', 'dr'],
    credit: ['credit', 'deposit', 'deposit amt', 'deposit amt.', 'cr'],
    balance: ['balance', 'closing balance', 'available balance'],
    reference: ['ref', 'reference', 'ref no', 'ref no.', 'chq./ref.no.', 'cheque no', 'txn id']
  }
};

/**
 * Parse CSV content into rows
 * @param {string} csvContent - Raw CSV content
 * @returns {Object} - { headers, rows }
 */
const parseCSVContent = (csvContent) => {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });
      rows.push(row);
    }
  }

  return { headers, rows };
};

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {string[]} - Parsed values
 */
const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values.map(v => v.replace(/^"|"$/g, '').trim());
};

/**
 * Detect column mapping from headers
 * @param {string[]} headers - CSV headers
 * @returns {Object} - Column mapping
 */
const detectColumnMapping = (headers) => {
  const mapping = {};
  const format = BANK_FORMATS.standard;

  for (const [field, aliases] of Object.entries(format)) {
    const matchedHeader = headers.find(h => 
      aliases.some(alias => h.includes(alias))
    );
    if (matchedHeader) {
      mapping[field] = matchedHeader;
    }
  }

  // Validate required columns
  if (!mapping.date) {
    throw new Error('CSV must have a date column (Date, Transaction Date, Txn Date)');
  }
  if (!mapping.debit && !mapping.credit) {
    throw new Error('CSV must have debit/credit or withdrawal/deposit columns');
  }

  return mapping;
};

/**
 * Parse date from various formats
 * @param {string} dateStr - Date string
 * @returns {Date} - Parsed date
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  // Common Indian date formats
  const formats = [
    /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/, // DD-MM-YYYY or DD/MM/YYYY
    /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/, // YYYY-MM-DD
    /^(\d{2})[-\/](\d{2})[-\/](\d{2})$/,  // DD-MM-YY
    /^(\d{2})\s+(\w{3})\s+(\d{4})$/       // DD MMM YYYY
  ];

  // Try DD-MM-YYYY
  let match = dateStr.match(formats[0]);
  if (match) {
    return new Date(match[3], match[2] - 1, match[1]);
  }

  // Try YYYY-MM-DD
  match = dateStr.match(formats[1]);
  if (match) {
    return new Date(match[1], match[2] - 1, match[3]);
  }

  // Try DD-MM-YY
  match = dateStr.match(formats[2]);
  if (match) {
    const year = parseInt(match[3]) > 50 ? 1900 + parseInt(match[3]) : 2000 + parseInt(match[3]);
    return new Date(year, match[2] - 1, match[1]);
  }

  // Fallback to Date.parse
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
};

/**
 * Parse amount string to number
 * @param {string} amountStr - Amount string
 * @returns {number} - Parsed amount
 */
const parseAmount = (amountStr) => {
  if (!amountStr) return 0;
  
  // Remove currency symbols, commas, spaces
  const cleaned = amountStr
    .replace(/[₹$€£]/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.abs(amount);
};

/**
 * Validate CSV row
 * @param {Object} row - Parsed row
 * @param {Object} mapping - Column mapping
 * @param {number} rowIndex - Row index for error reporting
 * @returns {Object} - { valid, errors }
 */
const validateRow = (row, mapping, rowIndex) => {
  const errors = [];

  const dateStr = row[mapping.date];
  const date = parseDate(dateStr);
  if (!date) {
    errors.push(`Row ${rowIndex + 1}: Invalid date "${dateStr}"`);
  }

  const debit = parseAmount(row[mapping.debit]);
  const credit = parseAmount(row[mapping.credit]);
  if (debit === 0 && credit === 0) {
    errors.push(`Row ${rowIndex + 1}: Both debit and credit are zero or invalid`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Parse CSV bank statement into normalized transactions
 * @param {string} csvContent - Raw CSV content
 * @param {string} userId - User ID
 * @param {string} sourceAccount - Optional account identifier
 * @returns {Object} - { transactions, errors, summary }
 */
const parseCSVStatement = (csvContent, userId, sourceAccount = null) => {
  const { headers, rows } = parseCSVContent(csvContent);
  const mapping = detectColumnMapping(headers);

  const transactions = [];
  const errors = [];

  rows.forEach((row, index) => {
    const validation = validateRow(row, mapping, index);
    if (!validation.valid) {
      errors.push(...validation.errors);
      return;
    }

    const date = parseDate(row[mapping.date]);
    const debit = parseAmount(row[mapping.debit]);
    const credit = parseAmount(row[mapping.credit]);
    const narration = row[mapping.narration] || '';
    const reference = row[mapping.reference] || '';
    const balance = mapping.balance ? parseAmount(row[mapping.balance]) : null;

    const amount = credit > 0 ? credit : debit;
    const type = credit > 0 ? 'CREDIT' : 'DEBIT';

    const { category, subcategory } = categorizeTransaction(narration);
    const merchant = extractMerchant(narration);

    transactions.push({
      txn_id: reference || `CSV_${userId}_${date.getTime()}_${index}`,
      user_id: userId,
      consent_id: null,
      date,
      amount,
      type,
      merchant,
      category,
      subcategory,
      source_type: 'BANK_ACCOUNT',
      source_account: sourceAccount,
      mode: detectPaymentMode(narration),
      reference,
      narration,
      balance,
      currency: 'INR',
      raw_data: row
    });
  });

  return {
    transactions,
    errors,
    summary: {
      totalRows: rows.length,
      parsed: transactions.length,
      failed: errors.length,
      totalCredit: transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0),
      totalDebit: transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0)
    }
  };
};

/**
 * Detect payment mode from narration
 * @param {string} narration - Transaction narration
 * @returns {string} - Payment mode
 */
const detectPaymentMode = (narration) => {
  if (!narration) return 'OTHER';
  const lower = narration.toLowerCase();
  
  if (lower.includes('upi')) return 'UPI';
  if (lower.includes('neft')) return 'NEFT';
  if (lower.includes('imps')) return 'IMPS';
  if (lower.includes('rtgs')) return 'RTGS';
  if (lower.includes('atm')) return 'ATM';
  if (lower.includes('pos') || lower.includes('card')) return 'CARD';
  if (lower.includes('cheque') || lower.includes('chq')) return 'CHEQUE';
  if (lower.includes('cash')) return 'CASH';
  
  return 'OTHER';
};

/**
 * Get sample CSV format
 * @returns {string} - Sample CSV content
 */
const getSampleCSVFormat = () => {
  return `Date,Description,Debit,Credit,Balance,Reference
01-11-2024,SALARY CREDIT NOV 2024,,50000.00,150000.00,SAL001
02-11-2024,UPI-SWIGGY-ORDER123,500.00,,149500.00,UPI001
03-11-2024,NEFT-RENT PAYMENT,15000.00,,134500.00,NEFT001
05-11-2024,ATM WITHDRAWAL,5000.00,,129500.00,ATM001
10-11-2024,UPI-AMAZON PAY,2500.00,,127000.00,UPI002
15-11-2024,INTEREST CREDIT,,125.50,127125.50,INT001`;
};

module.exports = {
  parseCSVContent,
  parseCSVLine,
  detectColumnMapping,
  parseDate,
  parseAmount,
  validateRow,
  parseCSVStatement,
  detectPaymentMode,
  getSampleCSVFormat,
  BANK_FORMATS
};

