const express = require('express');
const Geofence = require('../models/Geofence');
const Incident = require('../models/Incident');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all geofences
router.get('/', auth, async (req, res) => {
  try {
    const geofences = await Geofence.find({ userId: req.userId, isActive: true });
    res.json(geofences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create geofence
router.post('/', auth, async (req, res) => {
  try {
    const { name, lat, lng, address, radius } = req.body;
    
    const geofence = new Geofence({
      userId: req.userId,
      name,
      location: { lat: parseFloat(lat), lng: parseFloat(lng), address },
      radius: parseInt(radius) || 500
    });

    await geofence.save();
    res.json(geofence);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update geofence
router.put('/:id', auth, async (req, res) => {
  try {
    const geofence = await Geofence.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!geofence) {
      return res.status(404).json({ message: 'Geofence not found' });
    }

    Object.assign(geofence, req.body);
    await geofence.save();
    
    res.json(geofence);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete geofence
router.delete('/:id', auth, async (req, res) => {
  try {
    const geofence = await Geofence.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!geofence) {
      return res.status(404).json({ message: 'Geofence not found' });
    }

    await geofence.deleteOne();
    res.json({ message: 'Geofence deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check incidents in geofence (called periodically)
router.get('/:id/check', auth, async (req, res) => {
  try {
    const geofence = await Geofence.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!geofence) {
      return res.status(404).json({ message: 'Geofence not found' });
    }

    const incidents = await Incident.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [geofence.location.lng, geofence.location.lat]
          },
          $maxDistance: geofence.radius
        }
      },
      status: 'active',
      severity: { $in: ['high', 'medium'] }
    });

    if (incidents.length > 0) {
      // Update last alerted time
      geofence.lastAlerted = new Date();
      await geofence.save();

      // Emit geofence alert
      const io = req.app.get('io');
      io.to(`user-${req.userId}`).emit('geofence-alert', {
        geofence,
        incidents
      });
    }

    res.json({ incidents, alerted: incidents.length > 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

