const express = require('express');
const Incident = require('../models/Incident');
const SOSAlert = require('../models/SOSAlert');
const auth = require('../middleware/auth');
const router = express.Router();

// Get live community feed
router.get('/', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 10000 } = req.query; // 10km default radius
    
    let query = { status: 'active' };
    
    // If location provided, filter by proximity
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      };
    }

    const incidents = await Incident.find(query)
      .populate('userId', 'name credibility')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get recent SOS alerts
    const sosAlerts = await SOSAlert.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Combine and format feed items
    const feed = [
      ...incidents.map(inc => ({
        type: 'incident',
        id: inc._id,
        userId: inc.userId?._id,
        userName: inc.userId?.name,
        userCredibility: inc.userId?.credibility,
        incidentType: inc.type,
        severity: inc.severity,
        location: inc.location,
        description: inc.description,
        media: inc.media,
        confidence: inc.confidence,
        createdAt: inc.createdAt,
        reactions: {
          confirmations: inc.confidence.confirmations,
          denials: inc.confidence.denials
        }
      })),
      ...sosAlerts.map(alert => ({
        type: 'sos',
        id: alert._id,
        userId: alert.userId?._id,
        userName: alert.userId?.name,
        location: alert.location,
        createdAt: alert.createdAt,
        status: alert.status
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(feed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

