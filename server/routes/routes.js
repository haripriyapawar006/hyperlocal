const express = require('express');
const Incident = require('../models/Incident');
const auth = require('../middleware/auth');
const router = express.Router();

// Calculate safe route
router.post('/calculate', auth, async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.body;
    
    // Find incidents along the route (simplified - in production, use proper routing API)
    const incidents = await Incident.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [
              (parseFloat(startLng) + parseFloat(endLng)) / 2,
              (parseFloat(startLat) + parseFloat(endLat)) / 2
            ]
          },
          $maxDistance: 5000 // 5km radius
        }
      },
      status: 'active',
      severity: { $in: ['high', 'medium'] }
    });

    // Calculate route with hazard avoidance
    // In production, integrate with Google Maps Directions API or similar
    const route = {
      start: { lat: parseFloat(startLat), lng: parseFloat(startLng) },
      end: { lat: parseFloat(endLat), lng: parseFloat(endLng) },
      waypoints: [],
      hazards: incidents.map(inc => ({
        location: inc.location,
        type: inc.type,
        severity: inc.severity,
        confidence: inc.confidence.score
      })),
      alternativeRoutes: [
        // Simplified alternative route (in production, calculate actual alternatives)
        {
          start: { lat: parseFloat(startLat), lng: parseFloat(startLng) },
          end: { lat: parseFloat(endLat), lng: parseFloat(endLng) },
          waypoints: [
            { lat: parseFloat(startLat) + 0.01, lng: parseFloat(startLng) + 0.01 }
          ],
          hazardCount: 0
        }
      ],
      recommended: incidents.length === 0 ? 'primary' : 'alternative'
    };

    res.json(route);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get historical incident patterns for route
router.post('/historical-analysis', auth, async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.body;
    
    // Get historical incidents in the area (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalIncidents = await Incident.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [
              (parseFloat(startLng) + parseFloat(endLng)) / 2,
              (parseFloat(startLat) + parseFloat(endLat)) / 2
            ]
          },
          $maxDistance: 5000
        }
      },
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Analyze patterns
    const patterns = {
      totalIncidents: historicalIncidents.length,
      byType: {},
      bySeverity: {},
      byTimeOfDay: {},
      hotspots: [],
      recommendations: []
    };

    historicalIncidents.forEach(incident => {
      // Count by type
      patterns.byType[incident.type] = (patterns.byType[incident.type] || 0) + 1;
      
      // Count by severity
      patterns.bySeverity[incident.severity] = (patterns.bySeverity[incident.severity] || 0) + 1;
      
      // Count by time of day
      const hour = new Date(incident.createdAt).getHours();
      const timeSlot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      patterns.byTimeOfDay[timeSlot] = (patterns.byTimeOfDay[timeSlot] || 0) + 1;
    });

    // Generate recommendations
    if (patterns.totalIncidents > 10) {
      patterns.recommendations.push('High incident frequency in this area. Exercise caution.');
    }
    if (patterns.bySeverity.high > 5) {
      patterns.recommendations.push('Multiple high-severity incidents reported. Consider alternate route.');
    }

    res.json(patterns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

