const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/db');

/**
 * ConsentRecord Model
 * 
 * Stores AA consent records with immutability and tamper-evidence.
 * Records should not be updated - create new versions instead.
 */
const ConsentRecord = sequelize.define('ConsentRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  consent_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  consent_handle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  customer_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  aa_request: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  aa_response: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  scopes: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  purpose_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fip_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  data_hash: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'consent_records',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: (record) => {
      // Generate tamper-evident hash before saving
      record.data_hash = ConsentRecord.generateHash(record);
    },
    beforeUpdate: () => {
      // Prevent updates - records are immutable
      throw new Error('ConsentRecord is immutable. Create a new version instead.');
    }
  }
});

/**
 * Generate SHA-256 hash for tamper detection
 * @param {Object} record - Consent record data
 * @returns {string} - SHA-256 hash
 */
ConsentRecord.generateHash = (record) => {
  const dataToHash = JSON.stringify({
    consent_id: record.consent_id,
    user_id: record.user_id,
    customer_id: record.customer_id,
    aa_request: record.aa_request,
    aa_response: record.aa_response,
    scopes: record.scopes,
    status: record.status,
    expires_at: record.expires_at,
    version: record.version,
    parent_id: record.parent_id
  });
  
  return crypto.createHash('sha256').update(dataToHash).digest('hex');
};

/**
 * Verify record integrity
 * @returns {boolean} - True if record is not tampered
 */
ConsentRecord.prototype.verifyIntegrity = function() {
  const expectedHash = ConsentRecord.generateHash(this);
  return this.data_hash === expectedHash;
};

/**
 * Create a new version of consent record (for status updates)
 * @param {Object} updates - Fields to update
 * @returns {ConsentRecord} - New version of the record
 */
ConsentRecord.prototype.createNewVersion = async function(updates) {
  const newRecord = await ConsentRecord.create({
    consent_id: `${this.consent_id}_v${this.version + 1}`,
    consent_handle: this.consent_handle,
    user_id: this.user_id,
    customer_id: this.customer_id,
    aa_request: this.aa_request,
    aa_response: updates.aa_response || this.aa_response,
    scopes: updates.scopes || this.scopes,
    status: updates.status || this.status,
    purpose_code: this.purpose_code,
    fip_id: updates.fip_id || this.fip_id,
    version: this.version + 1,
    parent_id: this.id,
    expires_at: updates.expires_at || this.expires_at
  });
  
  return newRecord;
};

/**
 * Get consent history (all versions)
 * @param {string} consentId - Original consent ID
 * @returns {ConsentRecord[]} - All versions ordered by version
 */
ConsentRecord.getHistory = async (consentId) => {
  return await ConsentRecord.findAll({
    where: {
      [sequelize.Sequelize.Op.or]: [
        { consent_id: consentId },
        { consent_id: { [sequelize.Sequelize.Op.like]: `${consentId}_v%` } }
      ]
    },
    order: [['version', 'ASC']]
  });
};

/**
 * Check if consent is valid (not expired and approved)
 * @returns {boolean}
 */
ConsentRecord.prototype.isValid = function() {
  return this.status === 'APPROVED' && new Date(this.expires_at) > new Date();
};

// Associations
ConsentRecord.associate = (models) => {
  ConsentRecord.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  ConsentRecord.belongsTo(ConsentRecord, {
    foreignKey: 'parent_id',
    as: 'parent'
  });
};

module.exports = ConsentRecord;

