const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// Helper: Split name into first_name and last_name
const splitName = (name) => {
  if (!name || typeof name !== 'string') {
    return { first_name: null, last_name: null };
  }
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return { first_name: trimmed || null, last_name: null };
  }
  return {
    first_name: trimmed.substring(0, spaceIndex),
    last_name: trimmed.substring(spaceIndex + 1).trim() || null
  };
};

// Register with email/password
const register = async (req, res) => {
  try {
    const { email, phone, password, confirm_password, name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!confirm_password) {
      return res.status(400).json({ error: 'Confirm password is required' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      where: email ? { email } : { phone }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = crypto.randomBytes(16).toString('hex');
    const password_hash = await bcrypt.hash(password + salt, 12);

    // Split name into first_name and last_name
    const { first_name, last_name } = splitName(name);

    // Create user
    const user = await User.create({
      email,
      phone,
      password_hash,
      salt,
      first_name,
      last_name
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await user.update({ refresh_token: refreshToken });

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, phone: user.phone, first_name: user.first_name, last_name: user.last_name }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login with email/password
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Find user
    const user = await User.findOne({
      where: email ? { email } : { phone }
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password + user.salt, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens (rotation)
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Update refresh token
    await user.update({ refresh_token: refreshToken });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, phone: user.phone, first_name: user.first_name, last_name: user.last_name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Google login
const googleLogin = async (req, res) => {
  try {
    const { google_id, email, name } = req.body;

    if (!google_id) {
      return res.status(400).json({ error: 'Google ID is required' });
    }

    // Split name into first_name and last_name
    const { first_name, last_name } = splitName(name);

    // Find or create user
    let user = await User.findOne({ where: { google_id } });

    if (!user && email) {
      user = await User.findOne({ where: { email } });
      if (user) {
        await user.update({ google_id, first_name: user.first_name || first_name, last_name: user.last_name || last_name });
      }
    }

    if (!user) {
      user = await User.create({ google_id, email, first_name, last_name });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await user.update({ refresh_token: refreshToken });

    res.json({
      message: 'Google login successful',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, google_id: user.google_id, first_name: user.first_name, last_name: user.last_name }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Google login failed' });
  }
};

// Apple login
const appleLogin = async (req, res) => {
  try {
    const { apple_id, email, name } = req.body;

    if (!apple_id) {
      return res.status(400).json({ error: 'Apple ID is required' });
    }

    // Split name into first_name and last_name
    const { first_name, last_name } = splitName(name);

    // Find or create user
    let user = await User.findOne({ where: { apple_id } });

    if (!user && email) {
      user = await User.findOne({ where: { email } });
      if (user) {
        await user.update({ apple_id, first_name: user.first_name || first_name, last_name: user.last_name || last_name });
      }
    }

    if (!user) {
      user = await User.create({ apple_id, email, first_name, last_name });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await user.update({ refresh_token: refreshToken });

    res.json({
      message: 'Apple login successful',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, apple_id: user.apple_id, first_name: user.first_name, last_name: user.last_name }
    });
  } catch (error) {
    console.error('Apple login error:', error);
    res.status(500).json({ error: 'Apple login failed' });
  }
};

// Refresh token
const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and verify stored token
    const user = await User.findByPk(decoded.userId);

    if (!user || user.refresh_token !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    await user.update({ refresh_token: newRefreshToken });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const userId = req.userId;
    await User.update({ refresh_token: null }, { where: { id: userId } });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  appleLogin,
  refreshToken: refreshTokenHandler,
  logout
};

