const aaAdapter = require('../services/aaAdapter');
const ConsentRecord = require('../models/ConsentRecord');

/**
 * Initiate AA consent flow
 */
const initiateConsent = async (req, res) => {
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
};

/**
 * Handle AA callback after user consent
 */
const handleCallback = async (req, res) => {
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
};

/**
 * Check consent status
 */
const checkConsentStatus = async (req, res) => {
  try {
    const { consentHandle } = req.params;

    const result = await aaAdapter.checkConsentStatus(consentHandle);

    res.json(result);
  } catch (error) {
    console.error('AA consent status error:', error);
    res.status(500).json({ error: 'Failed to check consent status' });
  }
};

/**
 * Fetch financial data using approved consent
 */
const fetchData = async (req, res) => {
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
};

/**
 * Fetch bank statement using approved consent
 */
const fetchBankStatement = async (req, res) => {
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
};

module.exports = {
  initiateConsent,
  handleCallback,
  checkConsentStatus,
  fetchData,
  fetchBankStatement
};

