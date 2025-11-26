#!/usr/bin/env node
'use strict';

/**
 * Database Migration Script
 * 
 * This script handles database migrations for all environments (development, staging, production).
 * 
 * Commands:
 *   up    - Runs all migration files to create tables in the database
 *   down  - Rolls back all migrations (drops tables in reverse order)
 *   reset - Drops all tables and recreates them (down + up)
 *   drop  - Drops all tables without recreating them
 * 
 * Usage:
 *   node scripts/migrate.js <command> [environment]
 * 
 * Examples:
 *   node scripts/migrate.js up              # Run migrations in development
 *   node scripts/migrate.js up production   # Run migrations in production
 *   node scripts/migrate.js reset staging   # Reset staging database
 *   node scripts/migrate.js drop production # Drop all production tables
 * 
 * Environment Variables:
 *   Uses DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT by default.
 *   For specific environments, prefix with env name: PRODUCTION_DB_NAME, STAGING_DB_HOST, etc.
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Sequelize } = require('sequelize');

// Get command and environment from args
const args = process.argv.slice(2);
const command = args[0];
const env = args[1] || process.env.NODE_ENV || 'development';

// Set NODE_ENV
process.env.NODE_ENV = env;

// Database config based on environment
const getDbConfig = () => {
  const envPrefix = env.toUpperCase();
  return {
    database: process.env[`${envPrefix}_DB_NAME`] || process.env.DB_NAME,
    username: process.env[`${envPrefix}_DB_USER`] || process.env.DB_USER,
    password: process.env[`${envPrefix}_DB_PASSWORD`] || process.env.DB_PASSWORD,
    host: process.env[`${envPrefix}_DB_HOST`] || process.env.DB_HOST,
    port: process.env[`${envPrefix}_DB_PORT`] || process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: env === 'development' ? console.log : false
  };
};

const config = getDbConfig();
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging
});

// Get all migration files
const migrationsPath = path.resolve(__dirname, '../migrations');
const getMigrations = () => {
  return fs.readdirSync(migrationsPath)
    .filter(file => file.endsWith('.js'))
    .sort()
    .map(file => ({
      name: file,
      module: require(path.join(migrationsPath, file))
    }));
};

// Commands
const commands = {
  async up() {
    console.log(`\n🚀 Running migrations (${env})...\n`);
    const migrations = getMigrations();
    for (const migration of migrations) {
      console.log(`  ⬆️  Running: ${migration.name}`);
      await migration.module.up(sequelize.getQueryInterface(), Sequelize);
    }
    console.log('\n✅ All migrations completed!\n');
  },

  async down() {
    console.log(`\n🔽 Rolling back migrations (${env})...\n`);
    const migrations = getMigrations().reverse();
    for (const migration of migrations) {
      console.log(`  ⬇️  Rolling back: ${migration.name}`);
      await migration.module.down(sequelize.getQueryInterface(), Sequelize);
    }
    console.log('\n✅ All migrations rolled back!\n');
  },

  async reset() {
    console.log(`\n🔄 Resetting database (${env})...\n`);
    await commands.down();
    await commands.up();
    console.log('✅ Database reset completed!\n');
  },

  async drop() {
    console.log(`\n⚠️  Dropping all tables (${env})...\n`);
    await sequelize.getQueryInterface().dropAllTables();
    console.log('✅ All tables dropped!\n');
  }
};

// Help
const showHelp = () => {
  console.log(`
Usage: node scripts/migrate.js <command> [environment]

Commands:
  up      - Run all migrations (create tables)
  down    - Rollback all migrations (drop tables)
  reset   - Drop and recreate all tables
  drop    - Drop all tables without recreating

Environments:
  development (default)
  staging
  production

Examples:
  node scripts/migrate.js up
  node scripts/migrate.js up production
  node scripts/migrate.js reset staging
  node scripts/migrate.js drop development
`);
};

// Main
const main = async () => {
  if (!command || !commands[command]) {
    showHelp();
    process.exit(command ? 1 : 0);
  }

  try {
    await sequelize.authenticate();
    console.log(`\n📦 Connected to database (${env})`);
    await commands[command]();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

main();

