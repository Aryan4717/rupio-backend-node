const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middlewares/auth');
const {
  uploadCSV,
  getCSVFormat,
  getTransactions,
  getSummary
} = require('../controllers/transactionController');

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// POST /api/transactions/upload-csv - Upload and parse CSV bank statement
router.post('/upload-csv', authenticate, upload.single('file'), uploadCSV);

// GET /api/transactions/csv-format - Get sample CSV format
router.get('/csv-format', getCSVFormat);

// GET /api/transactions - Get user transactions with filters
router.get('/', authenticate, getTransactions);

// GET /api/transactions/summary - Get transaction summary/analytics
router.get('/summary', authenticate, getSummary);

module.exports = router;
