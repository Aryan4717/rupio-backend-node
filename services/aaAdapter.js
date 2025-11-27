/**
 * Account Aggregator (AA) Adapter Service
 * 
 * This module handles the Account Aggregator consent flow:
 * - Initiate consent request
 * - Build redirect URL for user authorization
 * - Handle callback after user consent
 * - Fetch data artifacts (e.g., bank statements)
 * 
 * Environment Variables Required:
 *   AA_BASE_URL        - AA gateway base URL
 *   AA_CLIENT_ID       - Your registered client ID
 *   AA_CLIENT_SECRET   - Your client secret
 *   AA_REDIRECT_URL    - Callback URL after consent
 *   AA_API_VERSION     - API version (default: v1)
 */

const crypto = require('crypto');

// Config from environment
const config = {
  baseUrl: process.env.AA_BASE_URL || 'https://aa-sandbox.example.com',
  clientId: process.env.AA_CLIENT_ID || 'your_client_id',
  clientSecret: process.env.AA_CLIENT_SECRET || 'your_client_secret',
  redirectUrl: process.env.AA_REDIRECT_URL || 'http://localhost:3000/api/aa/callback',
  apiVersion: process.env.AA_API_VERSION || 'v1'
};

/**
 * Generate unique transaction/session ID
 */
const generateTxnId = () => {
  return crypto.randomUUID();
};

/**
 * Initiate AA consent request
 * @param {Object} params - Consent parameters
 * @param {string} params.customerId - Customer's mobile number or VUA
 * @param {string[]} params.fiTypes - Financial Information types (e.g., ['DEPOSIT', 'CREDIT_CARD'])
 * @param {Date} params.fromDate - Data fetch start date
 * @param {Date} params.toDate - Data fetch end date
 * @returns {Object} - Consent handle and redirect URL
 */
const initiateConsent = async ({ customerId, fiTypes = ['DEPOSIT'], fromDate, toDate }) => {
  const txnId = generateTxnId();
  
  const consentRequest = {
    ver: '1.0',
    txnid: txnId,
    timestamp: new Date().toISOString(),
    ConsentDetail: {
      consentStart: new Date().toISOString(),
      consentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      consentMode: 'VIEW',
      fetchType: 'ONETIME',
      consentTypes: ['TRANSACTIONS', 'PROFILE', 'SUMMARY'],
      fiTypes: fiTypes,
      DataConsumer: {
        id: config.clientId
      },
      Customer: {
        id: customerId
      },
      Purpose: {
        code: '101',
        refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
        text: 'Wealth management service',
        Category: {
          type: 'Personal Finance'
        }
      },
      FIDataRange: {
        from: fromDate?.toISOString() || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        to: toDate?.toISOString() || new Date().toISOString()
      },
      DataLife: {
        unit: 'MONTH',
        value: 1
      },
      Frequency: {
        unit: 'MONTH',
        value: 1
      }
    }
  };

  // TODO: Replace with actual HTTP call to AA
  // const response = await fetch(`${config.baseUrl}/${config.apiVersion}/Consent`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'client_api_key': config.clientId,
  //     'x-jws-signature': generateSignature(consentRequest)
  //   },
  //   body: JSON.stringify(consentRequest)
  // });
  // const data = await response.json();

  // Sample response (mock)
  const consentHandle = `CONSENT_${txnId}`;
  
  return {
    success: true,
    txnId,
    consentHandle,
    redirectUrl: buildRedirectUrl(consentHandle),
    request: consentRequest
  };
};

/**
 * Build redirect URL for user to authorize consent
 * @param {string} consentHandle - Consent handle from initiate response
 * @returns {string} - Redirect URL
 */
const buildRedirectUrl = (consentHandle) => {
  const params = new URLSearchParams({
    consentHandle,
    redirect_uri: config.redirectUrl,
    client_id: config.clientId
  });
  
  return `${config.baseUrl}/consent/authorize?${params.toString()}`;
};

/**
 * Handle callback after user consent
 * @param {Object} params - Callback parameters
 * @param {string} params.consentId - Consent ID from callback
 * @param {string} params.consentHandle - Original consent handle
 * @param {string} params.status - Consent status (APPROVED/REJECTED)
 * @returns {Object} - Consent status details
 */
const handleCallback = async ({ consentId, consentHandle, status }) => {
  if (status !== 'APPROVED') {
    return {
      success: false,
      message: 'Consent was rejected by user',
      consentId,
      status
    };
  }

  // TODO: Fetch consent artifact from AA
  // const response = await fetch(`${config.baseUrl}/${config.apiVersion}/Consent/${consentId}`, {
  //   method: 'GET',
  //   headers: {
  //     'client_api_key': config.clientId,
  //     'x-jws-signature': generateSignature({})
  //   }
  // });

  return {
    success: true,
    message: 'Consent approved successfully',
    consentId,
    consentHandle,
    status
  };
};

/**
 * Fetch data using approved consent
 * @param {string} consentId - Approved consent ID
 * @param {string} sessionId - Optional session ID
 * @returns {Object} - Financial data
 */
const fetchData = async (consentId, sessionId = null) => {
  const txnId = generateTxnId();
  const dataSessionId = sessionId || generateTxnId();

  const dataRequest = {
    ver: '1.0',
    txnid: txnId,
    timestamp: new Date().toISOString(),
    consentId,
    DataRange: {
      from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString()
    },
    KeyMaterial: {
      cryptoAlg: 'ECDH',
      curve: 'Curve25519',
      params: 'cipher=AES/GCM/NoPadding;KeyPairGenerator=ECDH'
    }
  };

  // TODO: Replace with actual HTTP call
  // Step 1: Create data session
  // const sessionResponse = await fetch(`${config.baseUrl}/${config.apiVersion}/FI/request`, {...});
  
  // Step 2: Fetch data
  // const dataResponse = await fetch(`${config.baseUrl}/${config.apiVersion}/FI/fetch/${sessionId}`, {...});

  return {
    success: true,
    txnId,
    sessionId: dataSessionId,
    request: dataRequest
  };
};

/**
 * Fetch bank statement (sample implementation)
 * @param {string} consentId - Approved consent ID
 * @returns {Object} - Bank statement data
 */
const fetchBankStatement = async (consentId) => {
  // First fetch data session
  const dataSession = await fetchData(consentId);
  
  if (!dataSession.success) {
    return dataSession;
  }

  // Sample bank statement response (mock)
  const sampleBankStatement = {
    ver: '1.0',
    txnid: dataSession.txnId,
    timestamp: new Date().toISOString(),
    FI: [
      {
        fipId: 'FIP_BANK_001',
        data: [
          {
            linkRefNumber: 'LINK_REF_001',
            maskedAccNumber: 'XXXX1234',
            Account: {
              type: 'SAVINGS',
              branch: 'Mumbai Main',
              status: 'ACTIVE',
              ifscCode: 'BANK0001234',
              micrCode: '400002001',
              openingDate: '2020-01-15',
              currentBalance: '150000.00',
              currency: 'INR',
              Transactions: {
                startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                Transaction: [
                  {
                    txnId: 'TXN001',
                    type: 'CREDIT',
                    mode: 'UPI',
                    amount: '25000.00',
                    currentBalance: '150000.00',
                    transactionTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    narration: 'Salary Credit',
                    reference: 'SAL/2024/001'
                  },
                  {
                    txnId: 'TXN002',
                    type: 'DEBIT',
                    mode: 'NEFT',
                    amount: '5000.00',
                    currentBalance: '125000.00',
                    transactionTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    narration: 'Bill Payment',
                    reference: 'NEFT/2024/002'
                  },
                  {
                    txnId: 'TXN003',
                    type: 'DEBIT',
                    mode: 'UPI',
                    amount: '1500.00',
                    currentBalance: '130000.00',
                    transactionTimestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    narration: 'Online Shopping',
                    reference: 'UPI/2024/003'
                  }
                ]
              }
            }
          }
        ]
      }
    ]
  };

  return {
    success: true,
    sessionId: dataSession.sessionId,
    data: sampleBankStatement
  };
};

/**
 * Check consent status
 * @param {string} consentHandle - Consent handle
 * @returns {Object} - Consent status
 */
const checkConsentStatus = async (consentHandle) => {
  // TODO: Replace with actual HTTP call
  // const response = await fetch(`${config.baseUrl}/${config.apiVersion}/Consent/handle/${consentHandle}`, {...});

  return {
    success: true,
    consentHandle,
    status: 'PENDING', // PENDING | APPROVED | REJECTED | EXPIRED
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  initiateConsent,
  buildRedirectUrl,
  handleCallback,
  fetchData,
  fetchBankStatement,
  checkConsentStatus,
  config
};

