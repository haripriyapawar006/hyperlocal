const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get current user's profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update current user's location (used for nearby responder discovery & auto-location)
router.post('/location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat === 'undefined' || typeof lng === 'undefined') {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.location = {
      ...(user.location || {}),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      lastUpdated: new Date(),
      type: 'Point',
      coordinates: [parseFloat(lng), parseFloat(lat)]
    };

    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


