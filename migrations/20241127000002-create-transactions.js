'use strict';

/**
 * Migration: Create transactions table
 * 
 * Stores normalized financial transactions from AA data
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      txn_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Original transaction ID from source'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      consent_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Associated AA consent ID'
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('CREDIT', 'DEBIT'),
        allowNull: false
      },
      merchant: {
        type: Sequelize.STRING,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      subcategory: {
        type: Sequelize.STRING,
        allowNull: true
      },
      source_type: {
        type: Sequelize.ENUM('BANK_ACCOUNT', 'CREDIT_CARD', 'LOAN', 'MUTUAL_FUND', 'INSURANCE', 'OTHER'),
        allowNull: false,
        defaultValue: 'BANK_ACCOUNT'
      },
      source_account: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Masked account number'
      },
      mode: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Payment mode: UPI, NEFT, IMPS, etc.'
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: true
      },
      narration: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Balance after transaction'
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'INR'
      },
      raw_data: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Original transaction data from AA'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indexes
    await queryInterface.addIndex('transactions', ['user_id']);
    await queryInterface.addIndex('transactions', ['date']);
    await queryInterface.addIndex('transactions', ['category']);
    await queryInterface.addIndex('transactions', ['source_type']);
    await queryInterface.addIndex('transactions', ['txn_id', 'user_id'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transactions');
  }
};

