const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  txn_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  consent_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('CREDIT', 'DEBIT'),
    allowNull: false
  },
  merchant: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subcategory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source_type: {
    type: DataTypes.ENUM('BANK_ACCOUNT', 'CREDIT_CARD', 'LOAN', 'MUTUAL_FUND', 'INSURANCE', 'OTHER'),
    allowNull: false,
    defaultValue: 'BANK_ACCOUNT'
  },
  source_account: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  narration: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR'
  },
  raw_data: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['txn_id', 'user_id'] }
  ]
});

module.exports = Transaction;

