const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Incident = require('../models/Incident');
const auth = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Create incident
router.post('/', auth, upload.array('media', 5), async (req, res) => {
  try {
    const { type, severity, lat, lng, address, description } = req.body;
    
    const media = req.files?.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'photo' : 
            file.mimetype.startsWith('video/') ? 'video' : 'audio',
      url: `/uploads/${file.filename}`,
      filename: file.filename
    })) || [];

    const incident = new Incident({
      userId: req.userId,
      type,
      severity,
      location: { lat: parseFloat(lat), lng: parseFloat(lng), address },
      description,
      media
    });

    await incident.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('new-incident', incident);

    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get nearby incidents
router.get('/nearby', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // radius in meters
    
    const incidents = await Incident.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      },
      status: 'active'
    })
    .populate('userId', 'name credibility')
    .sort({ createdAt: -1 })
    .limit(100);

    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all incidents
router.get('/', auth, async (req, res) => {
  try {
    const incidents = await Incident.find({ status: 'active' })
      .populate('userId', 'name credibility')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single incident
router.get('/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('userId', 'name credibility');
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// React to incident (confirm/deny)
router.post('/:id/react', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'confirm' or 'deny'
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Check if user already reacted
    const existingReaction = incident.confidence.verifiedBy.find(
      r => r.userId.toString() === req.userId
    );

    if (existingReaction) {
      // Update existing reaction
      if (existingReaction.action !== action) {
        if (existingReaction.action === 'confirm') {
          incident.confidence.confirmations--;
          incident.confidence.denials++;
        } else {
          incident.confidence.confirmations++;
          incident.confidence.denials--;
        }
        existingReaction.action = action;
      }
    } else {
      // Add new reaction
      incident.confidence.verifiedBy.push({
        userId: req.userId,
        action
      });
      
      if (action === 'confirm') {
        incident.confidence.confirmations++;
      } else {
        incident.confidence.denials++;
      }
    }

    // Calculate confidence score
    const total = incident.confidence.confirmations + incident.confidence.denials;
    if (total > 0) {
      incident.confidence.score = Math.round(
        (incident.confidence.confirmations / total) * 100
      );
    }

    await incident.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('incident-updated', incident);

    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add info to incident
router.post('/:id/info', auth, async (req, res) => {
  try {
    const { additionalInfo } = req.body;
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    incident.description = incident.description 
      ? `${incident.description}\n\n[Additional Info]: ${additionalInfo}`
      : additionalInfo;
    
    await incident.save();

    const io = req.app.get('io');
    io.emit('incident-updated', incident);

    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resolve incident
router.patch('/:id/resolve', auth, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    await incident.save();

    const io = req.app.get('io');
    io.emit('incident-resolved', incident);

    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

