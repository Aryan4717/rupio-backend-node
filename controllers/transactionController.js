const { parseCSVStatement, getSampleCSVFormat } = require('../services/csvParser');
const { saveTransactions } = require('../services/aaDataParser');
const Transaction = require('../models/Transaction');
const { Op, fn, col } = require('sequelize');

/**
 * Upload and parse CSV bank statement
 */
const uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const { sourceAccount } = req.body;

    // Parse CSV
    const parseResult = parseCSVStatement(csvContent, req.userId, sourceAccount);

    if (parseResult.errors.length > 0 && parseResult.transactions.length === 0) {
      return res.status(400).json({
        error: 'Failed to parse CSV',
        details: parseResult.errors
      });
    }

    // Save transactions
    const saveResult = await saveTransactions(parseResult.transactions);

    res.json({
      message: 'CSV uploaded and processed successfully',
      summary: parseResult.summary,
      saveResult,
      warnings: parseResult.errors.length > 0 ? parseResult.errors : undefined
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process CSV' });
  }
};

/**
 * Get sample CSV format
 */
const getCSVFormat = (req, res) => {
  res.json({
    description: 'Sample CSV format for bank statement upload',
    requiredColumns: ['Date', 'Debit or Credit amount'],
    optionalColumns: ['Description', 'Balance', 'Reference'],
    supportedDateFormats: ['DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    sampleCSV: getSampleCSVFormat(),
    notes: [
      'First row must be headers',
      'Either Debit or Credit column must have a value per row',
      'Amount can include currency symbols and commas (will be stripped)'
    ]
  });
};

/**
 * Get user transactions with filters
 */
const getTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      type, 
      source_type,
      from_date,
      to_date 
    } = req.query;

    const where = { user_id: req.userId };
    
    if (category) where.category = category;
    if (type) where.type = type;
    if (source_type) where.source_type = source_type;
    if (from_date || to_date) {
      where.date = {};
      if (from_date) where.date[Op.gte] = new Date(from_date);
      if (to_date) where.date[Op.lte] = new Date(to_date);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      transactions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

/**
 * Get transaction summary/analytics
 */
const getSummary = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const where = { user_id: req.userId };
    if (from_date || to_date) {
      where.date = {};
      if (from_date) where.date[Op.gte] = new Date(from_date);
      if (to_date) where.date[Op.lte] = new Date(to_date);
    }

    // Category-wise summary
    const categoryWise = await Transaction.findAll({
      where,
      attributes: [
        'category',
        'type',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['category', 'type'],
      raw: true
    });

    // Total income/expense
    const totals = await Transaction.findAll({
      where,
      attributes: [
        'type',
        [fn('SUM', col('amount')), 'total']
      ],
      group: ['type'],
      raw: true
    });

    res.json({
      categoryWise,
      totals: {
        income: totals.find(t => t.type === 'CREDIT')?.total || 0,
        expense: totals.find(t => t.type === 'DEBIT')?.total || 0
      }
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};

module.exports = {
  uploadCSV,
  getCSVFormat,
  getTransactions,
  getSummary
};

