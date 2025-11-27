/**
 * Tests for AA Adapter Service
 */

const {
  initiateConsent,
  buildRedirectUrl,
  handleCallback,
  checkConsentStatus,
  config
} = require('../services/aaAdapter');

describe('AA Adapter', () => {

  describe('initiateConsent', () => {
    test('should initiate consent with required params', async () => {
      const result = await initiateConsent({
        customerId: '9876543210@aa-fi',
        fiTypes: ['DEPOSIT'],
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-11-27')
      });

      expect(result.success).toBe(true);
      expect(result.txnId).toBeDefined();
      expect(result.consentHandle).toBeDefined();
      expect(result.redirectUrl).toContain('consentHandle');
      expect(result.request).toBeDefined();
      expect(result.request.ConsentDetail).toBeDefined();
    });

    test('should include correct consent details', async () => {
      const result = await initiateConsent({
        customerId: 'test@aa-fi',
        fiTypes: ['DEPOSIT', 'CREDIT_CARD']
      });

      const consentDetail = result.request.ConsentDetail;
      expect(consentDetail.fiTypes).toEqual(['DEPOSIT', 'CREDIT_CARD']);
      expect(consentDetail.Customer.id).toBe('test@aa-fi');
      expect(consentDetail.consentMode).toBe('VIEW');
      expect(consentDetail.fetchType).toBe('ONETIME');
    });

    test('should set default fiTypes if not provided', async () => {
      const result = await initiateConsent({
        customerId: 'test@aa-fi'
      });

      expect(result.request.ConsentDetail.fiTypes).toEqual(['DEPOSIT']);
    });

    test('should set default date range if not provided', async () => {
      const result = await initiateConsent({
        customerId: 'test@aa-fi'
      });

      const fiDataRange = result.request.ConsentDetail.FIDataRange;
      expect(fiDataRange.from).toBeDefined();
      expect(fiDataRange.to).toBeDefined();
    });

    test('should generate unique txnId for each request', async () => {
      const result1 = await initiateConsent({ customerId: 'test@aa-fi' });
      const result2 = await initiateConsent({ customerId: 'test@aa-fi' });

      expect(result1.txnId).not.toBe(result2.txnId);
    });
  });

  describe('buildRedirectUrl', () => {
    test('should build valid redirect URL', () => {
      const consentHandle = 'CONSENT_12345';
      const url = buildRedirectUrl(consentHandle);

      expect(url).toContain(config.baseUrl);
      expect(url).toContain('consentHandle=CONSENT_12345');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('client_id=');
    });

    test('should include all required query params', () => {
      const url = buildRedirectUrl('TEST_HANDLE');
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      expect(params.get('consentHandle')).toBe('TEST_HANDLE');
      expect(params.get('redirect_uri')).toBe(config.redirectUrl);
      expect(params.get('client_id')).toBe(config.clientId);
    });
  });

  describe('handleCallback', () => {
    test('should handle approved consent', async () => {
      const result = await handleCallback({
        consentId: 'CONSENT_123',
        consentHandle: 'HANDLE_123',
        status: 'APPROVED'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Consent approved successfully');
      expect(result.consentId).toBe('CONSENT_123');
      expect(result.status).toBe('APPROVED');
    });

    test('should handle rejected consent', async () => {
      const result = await handleCallback({
        consentId: 'CONSENT_123',
        consentHandle: 'HANDLE_123',
        status: 'REJECTED'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Consent was rejected by user');
      expect(result.status).toBe('REJECTED');
    });

    test('should handle expired consent', async () => {
      const result = await handleCallback({
        consentId: 'CONSENT_123',
        consentHandle: 'HANDLE_123',
        status: 'EXPIRED'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('checkConsentStatus', () => {
    test('should return consent status', async () => {
      const result = await checkConsentStatus('HANDLE_123');

      expect(result.success).toBe(true);
      expect(result.consentHandle).toBe('HANDLE_123');
      expect(result.status).toBeDefined();
      expect(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']).toContain(result.status);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('config', () => {
    test('should have all required config values', () => {
      expect(config.baseUrl).toBeDefined();
      expect(config.clientId).toBeDefined();
      expect(config.clientSecret).toBeDefined();
      expect(config.redirectUrl).toBeDefined();
      expect(config.apiVersion).toBeDefined();
    });
  });
});

// Mock AA Response fixtures for integration tests
const mockAAResponses = {
  consentInitiate: {
    ver: '1.0',
    txnid: 'f35761ac-4a18-11e8-96ff-0277a9fbfedc',
    timestamp: '2024-11-27T10:00:00.000Z',
    ConsentHandle: 'CONSENT_HANDLE_123'
  },

  consentStatus: {
    ver: '1.0',
    txnid: 'f35761ac-4a18-11e8-96ff-0277a9fbfedc',
    timestamp: '2024-11-27T10:05:00.000Z',
    ConsentStatus: {
      id: 'CONSENT_ID_123',
      status: 'APPROVED'
    }
  },

  fiData: {
    ver: '1.0',
    txnid: 'f35761ac-4a18-11e8-96ff-0277a9fbfedc',
    timestamp: '2024-11-27T10:10:00.000Z',
    FI: [{
      fipId: 'FIP_BANK_001',
      data: [{
        linkRefNumber: 'LINK_001',
        maskedAccNumber: 'XXXX1234',
        Account: {
          type: 'SAVINGS',
          branch: 'Mumbai Main',
          status: 'ACTIVE',
          ifscCode: 'BANK0001234',
          currentBalance: '150000.00',
          currency: 'INR',
          Transactions: {
            startDate: '2024-06-01',
            endDate: '2024-11-27',
            Transaction: [
              {
                txnId: 'TXN001',
                type: 'CREDIT',
                mode: 'UPI',
                amount: '50000.00',
                currentBalance: '150000.00',
                transactionTimestamp: '2024-11-25T10:30:00Z',
                narration: 'SALARY CREDIT NOV 2024',
                reference: 'SAL001'
              },
              {
                txnId: 'TXN002',
                type: 'DEBIT',
                mode: 'UPI',
                amount: '1500.00',
                currentBalance: '148500.00',
                transactionTimestamp: '2024-11-26T12:00:00Z',
                narration: 'UPI-SWIGGY-ORDER123',
                reference: 'UPI001'
              }
            ]
          }
        }
      }]
    }]
  },

  error: {
    ver: '1.0',
    txnid: 'f35761ac-4a18-11e8-96ff-0277a9fbfedc',
    timestamp: '2024-11-27T10:00:00.000Z',
    errorCode: 'InvalidRequest',
    errorMsg: 'Invalid consent request'
  }
};

module.exports = { mockAAResponses };

