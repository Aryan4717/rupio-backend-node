'use strict';

/**
 * Migration: Create consent_records table
 * 
 * Stores AA consent records with immutability and tamper-evidence:
 * - Records are never updated, only new versions created
 * - Hash field provides tamper detection
 * - Audit trail via version tracking
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consent_records', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      consent_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'AA consent ID from the aggregator'
      },
      consent_handle: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Consent handle used during flow'
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
      customer_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Customer VUA/mobile used for consent'
      },
      aa_request: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Original AA consent request payload'
      },
      aa_response: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'AA consent response payload'
      },
      scopes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Granted scopes/fiTypes array'
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      purpose_code: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Purpose code for consent'
      },
      fip_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Financial Information Provider ID'
      },
      data_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: 'SHA-256 hash for tamper detection'
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Version number for audit trail'
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'consent_records',
          key: 'id'
        },
        comment: 'Reference to previous version if updated'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Consent expiry timestamp'
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

    // Indexes for efficient queries
    await queryInterface.addIndex('consent_records', ['user_id']);
    await queryInterface.addIndex('consent_records', ['consent_id']);
    await queryInterface.addIndex('consent_records', ['status']);
    await queryInterface.addIndex('consent_records', ['expires_at']);
    await queryInterface.addIndex('consent_records', ['data_hash']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('consent_records');
  }
};

