/**
 * Tests for AA Data Parser Service
 */

const {
  categorizeTransaction,
  extractMerchant,
  mapSourceType,
  parseBankStatement,
  parseLoanDetails
} = require('../services/aaDataParser');

describe('AA Data Parser', () => {
  
  describe('categorizeTransaction', () => {
    test('should categorize salary transactions', () => {
      const result = categorizeTransaction('SALARY CREDIT FOR NOV 2024');
      expect(result.category).toBe('Income');
      expect(result.subcategory).toBe('Salary');
    });

    test('should categorize food delivery', () => {
      const result = categorizeTransaction('UPI-SWIGGY-ORDER123');
      expect(result.category).toBe('Food');
      expect(result.subcategory).toBe('Dining');
    });

    test('should categorize utility bills', () => {
      const result = categorizeTransaction('ELECTRICITY BILL BESCOM');
      expect(result.category).toBe('Utilities');
      expect(result.subcategory).toBe('Electricity');
    });

    test('should categorize transport', () => {
      const result = categorizeTransaction('UPI-UBER INDIA-RIDE');
      expect(result.category).toBe('Transport');
      expect(result.subcategory).toBe('Ride');
    });

    test('should return Other for unknown narration', () => {
      const result = categorizeTransaction('RANDOM TRANSACTION XYZ');
      expect(result.category).toBe('Other');
      expect(result.subcategory).toBe('Uncategorized');
    });

    test('should handle null narration', () => {
      const result = categorizeTransaction(null);
      expect(result.category).toBe('Other');
    });
  });

  describe('extractMerchant', () => {
    test('should extract merchant from UPI narration', () => {
      const result = extractMerchant('UPI-AMAZON PAY-PAYMENT123');
      expect(result).toBe('AMAZON PAY');
    });

    test('should extract merchant from NEFT narration', () => {
      const result = extractMerchant('NEFT-HDFC BANK-REF123');
      expect(result).toBe('HDFC BANK');
    });

    test('should handle simple narration', () => {
      const result = extractMerchant('Swiggy Order Payment');
      expect(result).toBe('Swiggy Order Payment');
    });

    test('should return null for null narration', () => {
      const result = extractMerchant(null);
      expect(result).toBeNull();
    });
  });

  describe('mapSourceType', () => {
    test('should map DEPOSIT to BANK_ACCOUNT', () => {
      expect(mapSourceType('DEPOSIT')).toBe('BANK_ACCOUNT');
    });

    test('should map CREDIT_CARD correctly', () => {
      expect(mapSourceType('CREDIT_CARD')).toBe('CREDIT_CARD');
    });

    test('should map LOAN correctly', () => {
      expect(mapSourceType('LOAN')).toBe('LOAN');
    });

    test('should return OTHER for unknown type', () => {
      expect(mapSourceType('UNKNOWN')).toBe('OTHER');
    });
  });

  describe('parseBankStatement', () => {
    const sampleAAResponse = {
      FI: [{
        fipId: 'FIP_BANK_001',
        data: [{
          maskedAccNumber: 'XXXX1234',
          Account: {
            type: 'SAVINGS',
            currency: 'INR',
            Transactions: {
              Transaction: [
                {
                  txnId: 'TXN001',
                  type: 'CREDIT',
                  mode: 'UPI',
                  amount: '25000.00',
                  currentBalance: '150000.00',
                  transactionTimestamp: '2024-11-25T10:30:00Z',
                  narration: 'SALARY CREDIT NOV 2024',
                  reference: 'SAL001'
                },
                {
                  txnId: 'TXN002',
                  type: 'DEBIT',
                  mode: 'UPI',
                  amount: '500.00',
                  currentBalance: '149500.00',
                  transactionTimestamp: '2024-11-26T12:00:00Z',
                  narration: 'UPI-SWIGGY-ORDER456',
                  reference: 'UPI001'
                }
              ]
            }
          }
        }]
      }]
    };

    test('should parse transactions from AA response', () => {
      const result = parseBankStatement(sampleAAResponse, 'user-123', 'consent-456');
      
      expect(result).toHaveLength(2);
      expect(result[0].txn_id).toBe('TXN001');
      expect(result[0].amount).toBe(25000);
      expect(result[0].type).toBe('CREDIT');
      expect(result[0].category).toBe('Income');
      expect(result[0].source_account).toBe('XXXX1234');
    });

    test('should categorize transactions correctly', () => {
      const result = parseBankStatement(sampleAAResponse, 'user-123', 'consent-456');
      
      expect(result[0].category).toBe('Income');
      expect(result[0].subcategory).toBe('Salary');
      expect(result[1].category).toBe('Food');
      expect(result[1].subcategory).toBe('Dining');
    });

    test('should handle empty response', () => {
      const result = parseBankStatement({}, 'user-123', 'consent-456');
      expect(result).toHaveLength(0);
    });

    test('should handle null response', () => {
      const result = parseBankStatement(null, 'user-123', 'consent-456');
      expect(result).toHaveLength(0);
    });
  });

  describe('parseLoanDetails', () => {
    const sampleLoanResponse = {
      FI: [{
        fipId: 'FIP_BANK_001',
        data: [{
          maskedAccNumber: 'LOAN1234',
          Loan: {
            loanType: 'HOME_LOAN',
            lenderName: 'HDFC Bank',
            EMIs: {
              EMI: [
                {
                  txnId: 'EMI001',
                  dueDate: '2024-11-05',
                  amount: '35000.00'
                }
              ]
            }
          }
        }]
      }]
    };

    test('should parse loan EMI transactions', () => {
      const result = parseLoanDetails(sampleLoanResponse, 'user-123', 'consent-456');
      
      expect(result).toHaveLength(1);
      expect(result[0].txn_id).toBe('EMI001');
      expect(result[0].amount).toBe(35000);
      expect(result[0].type).toBe('DEBIT');
      expect(result[0].category).toBe('Loan');
      expect(result[0].source_type).toBe('LOAN');
    });

    test('should handle empty loan response', () => {
      const result = parseLoanDetails({}, 'user-123', 'consent-456');
      expect(result).toHaveLength(0);
    });
  });
});

