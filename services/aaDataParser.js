/**
 * AA Data Parser Service
 * 
 * Parses and normalizes financial data from Account Aggregator responses
 * into standardized transaction records.
 */

const Transaction = require('../models/Transaction');

// Category mapping based on narration keywords
const CATEGORY_RULES = [
  { keywords: ['salary', 'payroll', 'wages'], category: 'Income', subcategory: 'Salary' },
  { keywords: ['interest', 'int credit'], category: 'Income', subcategory: 'Interest' },
  { keywords: ['dividend'], category: 'Income', subcategory: 'Dividend' },
  { keywords: ['refund', 'cashback'], category: 'Income', subcategory: 'Refund' },
  { keywords: ['rent', 'rental'], category: 'Housing', subcategory: 'Rent' },
  { keywords: ['electricity', 'power', 'bescom', 'discom'], category: 'Utilities', subcategory: 'Electricity' },
  { keywords: ['water', 'bwssb'], category: 'Utilities', subcategory: 'Water' },
  { keywords: ['gas', 'lpg', 'indane', 'bharat gas'], category: 'Utilities', subcategory: 'Gas' },
  { keywords: ['mobile', 'recharge', 'airtel', 'jio', 'vi ', 'bsnl'], category: 'Utilities', subcategory: 'Mobile' },
  { keywords: ['broadband', 'internet', 'wifi'], category: 'Utilities', subcategory: 'Internet' },
  { keywords: ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'hotel'], category: 'Food', subcategory: 'Dining' },
  { keywords: ['grocery', 'bigbasket', 'blinkit', 'zepto', 'dmart'], category: 'Food', subcategory: 'Groceries' },
  { keywords: ['amazon', 'flipkart', 'myntra', 'shopping', 'mall'], category: 'Shopping', subcategory: 'Online' },
  { keywords: ['uber', 'ola', 'rapido', 'taxi', 'cab'], category: 'Transport', subcategory: 'Ride' },
  { keywords: ['petrol', 'diesel', 'fuel', 'iocl', 'bpcl', 'hpcl'], category: 'Transport', subcategory: 'Fuel' },
  { keywords: ['metro', 'bus', 'train', 'irctc'], category: 'Transport', subcategory: 'Public' },
  { keywords: ['emi', 'loan', 'equated'], category: 'Loan', subcategory: 'EMI' },
  { keywords: ['insurance', 'lic', 'premium'], category: 'Insurance', subcategory: 'Premium' },
  { keywords: ['mutual fund', 'sip', 'investment'], category: 'Investment', subcategory: 'Mutual Fund' },
  { keywords: ['atm', 'cash withdrawal'], category: 'Cash', subcategory: 'ATM' },
  { keywords: ['transfer', 'upi', 'neft', 'imps', 'rtgs'], category: 'Transfer', subcategory: 'Bank Transfer' },
  { keywords: ['netflix', 'prime', 'hotstar', 'spotify', 'subscription'], category: 'Entertainment', subcategory: 'Subscription' },
  { keywords: ['hospital', 'medical', 'pharmacy', 'doctor', 'clinic'], category: 'Health', subcategory: 'Medical' },
  { keywords: ['school', 'college', 'tuition', 'education', 'course'], category: 'Education', subcategory: 'Fees' }
];

/**
 * Categorize transaction based on narration
 * @param {string} narration - Transaction narration
 * @returns {Object} - { category, subcategory }
 */
const categorizeTransaction = (narration) => {
  if (!narration) return { category: 'Other', subcategory: 'Uncategorized' };
  
  const lowerNarration = narration.toLowerCase();
  
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(keyword => lowerNarration.includes(keyword))) {
      return { category: rule.category, subcategory: rule.subcategory };
    }
  }
  
  return { category: 'Other', subcategory: 'Uncategorized' };
};

/**
 * Extract merchant name from narration
 * @param {string} narration - Transaction narration
 * @returns {string|null} - Merchant name
 */
const extractMerchant = (narration) => {
  if (!narration) return null;
  
  // Common patterns: "UPI-MERCHANT NAME-...", "NEFT-MERCHANT-..."
  const patterns = [
    /UPI[-\/]([A-Za-z0-9\s]+?)[-\/]/i,
    /NEFT[-\/]([A-Za-z0-9\s]+?)[-\/]/i,
    /IMPS[-\/]([A-Za-z0-9\s]+?)[-\/]/i,
    /to\s+([A-Za-z0-9\s]+)/i,
    /from\s+([A-Za-z0-9\s]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = narration.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 100);
    }
  }
  
  // Return first part of narration as merchant
  return narration.split(/[-\/]/)[0].trim().substring(0, 100) || null;
};

/**
 * Map FI type to source_type
 * @param {string} fiType - AA FI type
 * @param {string} accountType - Account type
 * @returns {string} - Source type enum value
 */
const mapSourceType = (fiType, accountType) => {
  const mapping = {
    'DEPOSIT': 'BANK_ACCOUNT',
    'SAVINGS': 'BANK_ACCOUNT',
    'CURRENT': 'BANK_ACCOUNT',
    'CREDIT_CARD': 'CREDIT_CARD',
    'TERM_DEPOSIT': 'BANK_ACCOUNT',
    'RECURRING_DEPOSIT': 'BANK_ACCOUNT',
    'LOAN': 'LOAN',
    'MUTUAL_FUND': 'MUTUAL_FUND',
    'INSURANCE': 'INSURANCE'
  };
  
  return mapping[fiType] || mapping[accountType] || 'OTHER';
};

/**
 * Parse bank statement from AA response
 * @param {Object} aaResponse - AA FI response
 * @param {string} userId - User ID
 * @param {string} consentId - Consent ID
 * @returns {Object[]} - Parsed transactions
 */
const parseBankStatement = (aaResponse, userId, consentId) => {
  const transactions = [];
  
  if (!aaResponse?.FI) return transactions;
  
  for (const fi of aaResponse.FI) {
    const fipId = fi.fipId;
    
    for (const data of fi.data || []) {
      const account = data.Account;
      const maskedAccNumber = data.maskedAccNumber;
      const sourceType = mapSourceType(account?.type);
      
      const txnList = account?.Transactions?.Transaction || [];
      
      for (const txn of txnList) {
        const { category, subcategory } = categorizeTransaction(txn.narration);
        const merchant = extractMerchant(txn.narration);
        
        transactions.push({
          txn_id: txn.txnId,
          user_id: userId,
          consent_id: consentId,
          date: new Date(txn.transactionTimestamp),
          amount: parseFloat(txn.amount),
          type: txn.type,
          merchant,
          category,
          subcategory,
          source_type: sourceType,
          source_account: maskedAccNumber,
          mode: txn.mode,
          reference: txn.reference,
          narration: txn.narration,
          balance: txn.currentBalance ? parseFloat(txn.currentBalance) : null,
          currency: account?.currency || 'INR',
          raw_data: txn
        });
      }
    }
  }
  
  return transactions;
};

/**
 * Parse loan details from AA response
 * @param {Object} aaResponse - AA FI response
 * @param {string} userId - User ID
 * @param {string} consentId - Consent ID
 * @returns {Object[]} - Parsed loan transactions
 */
const parseLoanDetails = (aaResponse, userId, consentId) => {
  const transactions = [];
  
  if (!aaResponse?.FI) return transactions;
  
  for (const fi of aaResponse.FI) {
    for (const data of fi.data || []) {
      const loan = data.Loan || data.Account;
      if (!loan) continue;
      
      const maskedAccNumber = data.maskedAccNumber;
      
      // Parse EMI transactions
      const emiList = loan.EMIs?.EMI || [];
      for (const emi of emiList) {
        transactions.push({
          txn_id: emi.txnId || `EMI_${maskedAccNumber}_${emi.dueDate}`,
          user_id: userId,
          consent_id: consentId,
          date: new Date(emi.dueDate || emi.paidDate),
          amount: parseFloat(emi.amount || emi.emiAmount),
          type: 'DEBIT',
          merchant: loan.lenderName || 'Loan EMI',
          category: 'Loan',
          subcategory: 'EMI',
          source_type: 'LOAN',
          source_account: maskedAccNumber,
          mode: 'AUTO_DEBIT',
          narration: `EMI Payment - ${loan.loanType || 'Loan'}`,
          raw_data: emi
        });
      }
    }
  }
  
  return transactions;
};

/**
 * Save parsed transactions to database
 * @param {Object[]} transactions - Parsed transactions
 * @returns {Object} - { saved, skipped, errors }
 */
const saveTransactions = async (transactions) => {
  const result = { saved: 0, skipped: 0, errors: [] };
  
  for (const txn of transactions) {
    try {
      await Transaction.upsert(txn, {
        conflictFields: ['txn_id', 'user_id']
      });
      result.saved++;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        result.skipped++;
      } else {
        result.errors.push({ txn_id: txn.txn_id, error: error.message });
      }
    }
  }
  
  return result;
};

/**
 * Process AA response and save normalized transactions
 * @param {Object} aaResponse - AA FI response
 * @param {string} userId - User ID
 * @param {string} consentId - Consent ID
 * @returns {Object} - Processing result
 */
const processAAResponse = async (aaResponse, userId, consentId) => {
  // Parse different data types
  const bankTransactions = parseBankStatement(aaResponse, userId, consentId);
  const loanTransactions = parseLoanDetails(aaResponse, userId, consentId);
  
  const allTransactions = [...bankTransactions, ...loanTransactions];
  
  // Save to database
  const saveResult = await saveTransactions(allTransactions);
  
  return {
    success: true,
    totalParsed: allTransactions.length,
    ...saveResult
  };
};

module.exports = {
  categorizeTransaction,
  extractMerchant,
  mapSourceType,
  parseBankStatement,
  parseLoanDetails,
  saveTransactions,
  processAAResponse,
  CATEGORY_RULES
};

