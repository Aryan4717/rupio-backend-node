const express = require('express');
const router = express.Router();
const aaAdapter = require('../services/aaAdapter');
const { authenticate } = require('../middlewares/auth');

/**
 * @route POST /api/aa/consent/initiate
 * @desc Initiate AA consent flow
 * @access Private
 */
router.post('/consent/initiate', authenticate, async (req, res) => {
  try {
    const { customerId, fiTypes, fromDate, toDate } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID (mobile/VUA) is required' });
    }

    const result = await aaAdapter.initiateConsent({
      customerId,
      fiTypes,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined
    });

    res.json(result);
  } catch (error) {
    console.error('AA consent initiate error:', error);
    res.status(500).json({ error: 'Failed to initiate consent' });
  }
});

/**
 * @route GET /api/aa/callback
 * @desc Handle AA callback after user consent
 * @access Public
 */
router.get('/callback', async (req, res) => {
  try {
    const { consentId, consentHandle, status, ecreq } = req.query;

    const result = await aaAdapter.handleCallback({
      consentId,
      consentHandle,
      status
    });

    // Redirect to frontend with result
    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      success: result.success,
      consentId: consentId || '',
      status: status || ''
    });

    res.redirect(`${redirectUrl}/aa/result?${params.toString()}`);
  } catch (error) {
    console.error('AA callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/aa/result?success=false&error=callback_failed`);
  }
});

/**
 * @route GET /api/aa/consent/status/:consentHandle
 * @desc Check consent status
 * @access Private
 */
router.get('/consent/status/:consentHandle', authenticate, async (req, res) => {
  try {
    const { consentHandle } = req.params;

    const result = await aaAdapter.checkConsentStatus(consentHandle);

    res.json(result);
  } catch (error) {
    console.error('AA consent status error:', error);
    res.status(500).json({ error: 'Failed to check consent status' });
  }
});

/**
 * @route POST /api/aa/data/fetch
 * @desc Fetch financial data using approved consent
 * @access Private
 */
router.post('/data/fetch', authenticate, async (req, res) => {
  try {
    const { consentId } = req.body;

    if (!consentId) {
      return res.status(400).json({ error: 'Consent ID is required' });
    }

    const result = await aaAdapter.fetchData(consentId);

    res.json(result);
  } catch (error) {
    console.error('AA data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

/**
 * @route POST /api/aa/bank-statement
 * @desc Fetch bank statement using approved consent
 * @access Private
 */
router.post('/bank-statement', authenticate, async (req, res) => {
  try {
    const { consentId } = req.body;

    if (!consentId) {
      return res.status(400).json({ error: 'Consent ID is required' });
    }

    const result = await aaAdapter.fetchBankStatement(consentId);

    res.json(result);
  } catch (error) {
    console.error('AA bank statement error:', error);
    res.status(500).json({ error: 'Failed to fetch bank statement' });
  }
});

module.exports = router;

