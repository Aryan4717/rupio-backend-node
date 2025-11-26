const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../utils/jwt');

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

describe('JWT Utils', () => {
  const testUserId = 'test-user-123';

  test('should generate access token', () => {
    const token = generateAccessToken(testUserId);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  test('should generate refresh token', () => {
    const token = generateRefreshToken(testUserId);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  test('should verify access token', () => {
    const token = generateAccessToken(testUserId);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(testUserId);
  });

  test('should verify refresh token', () => {
    const token = generateRefreshToken(testUserId);
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(testUserId);
  });

  test('should throw on invalid access token', () => {
    expect(() => verifyAccessToken('invalid-token')).toThrow();
  });

  test('should throw on invalid refresh token', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrow();
  });
});

describe('Password Hashing', () => {
  test('should hash password with salt', async () => {
    const password = 'testPassword123';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(password + salt, 12);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
  });

  test('should verify correct password', async () => {
    const password = 'testPassword123';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(password + salt, 12);

    const isValid = await bcrypt.compare(password + salt, hash);
    expect(isValid).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const password = 'testPassword123';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(password + salt, 12);

    const isValid = await bcrypt.compare('wrongPassword' + salt, hash);
    expect(isValid).toBe(false);
  });
});

