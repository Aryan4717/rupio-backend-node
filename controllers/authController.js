const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// Register with email/password
const register = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
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

    // Create user
    const user = await User.create({
      email,
      phone,
      password_hash,
      salt
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
      user: { id: user.id, email: user.email, phone: user.phone }
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
      user: { id: user.id, email: user.email, phone: user.phone }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Google login
const googleLogin = async (req, res) => {
  try {
    const { google_id, email } = req.body;

    if (!google_id) {
      return res.status(400).json({ error: 'Google ID is required' });
    }

    // Find or create user
    let user = await User.findOne({ where: { google_id } });

    if (!user && email) {
      user = await User.findOne({ where: { email } });
      if (user) {
        await user.update({ google_id });
      }
    }

    if (!user) {
      user = await User.create({ google_id, email });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await user.update({ refresh_token: refreshToken });

    res.json({
      message: 'Google login successful',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, google_id: user.google_id }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Google login failed' });
  }
};

// Apple login
const appleLogin = async (req, res) => {
  try {
    const { apple_id, email } = req.body;

    if (!apple_id) {
      return res.status(400).json({ error: 'Apple ID is required' });
    }

    // Find or create user
    let user = await User.findOne({ where: { apple_id } });

    if (!user && email) {
      user = await User.findOne({ where: { email } });
      if (user) {
        await user.update({ apple_id });
      }
    }

    if (!user) {
      user = await User.create({ apple_id, email });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await user.update({ refresh_token: refreshToken });

    res.json({
      message: 'Apple login successful',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, apple_id: user.apple_id }
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

