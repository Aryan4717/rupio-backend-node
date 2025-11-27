const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  initiateConsent,
  handleCallback,
  checkConsentStatus,
  fetchData,
  fetchBankStatement
} = require('../controllers/aaController');

// POST /api/aa/consent/initiate - Initiate AA consent flow
router.post('/consent/initiate', authenticate, initiateConsent);

// GET /api/aa/callback - Handle AA callback after user consent
router.get('/callback', handleCallback);

// GET /api/aa/consent/status/:consentHandle - Check consent status
router.get('/consent/status/:consentHandle', authenticate, checkConsentStatus);

// POST /api/aa/data/fetch - Fetch financial data using approved consent
router.post('/data/fetch', authenticate, fetchData);

// POST /api/aa/bank-statement - Fetch bank statement using approved consent
router.post('/bank-statement', authenticate, fetchBankStatement);

module.exports = router;
