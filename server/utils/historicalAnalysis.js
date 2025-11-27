const Incident = require('../models/Incident');

// Analyze historical incidents for patterns
async function analyzeHistoricalPatterns(location, radius = 2000) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const incidents = await Incident.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        $maxDistance: radius
      }
    },
    createdAt: { $gte: thirtyDaysAgo }
  });

  const analysis = {
    totalIncidents: incidents.length,
    averagePerDay: incidents.length / 30,
    riskLevel: 'low',
    patterns: {
      byType: {},
      bySeverity: {},
      byDayOfWeek: {},
      byTimeOfDay: {}
    },
    hotspots: [],
    predictions: []
  };

  incidents.forEach(incident => {
    // Type analysis
    analysis.patterns.byType[incident.type] = 
      (analysis.patterns.byType[incident.type] || 0) + 1;

    // Severity analysis
    analysis.patterns.bySeverity[incident.severity] = 
      (analysis.patterns.bySeverity[incident.severity] || 0) + 1;

    // Day of week analysis
    const dayOfWeek = new Date(incident.createdAt).getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    analysis.patterns.byDayOfWeek[dayName] = 
      (analysis.patterns.byDayOfWeek[dayName] || 0) + 1;

    // Time of day analysis
    const hour = new Date(incident.createdAt).getHours();
    const timeSlot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    analysis.patterns.byTimeOfDay[timeSlot] = 
      (analysis.patterns.byTimeOfDay[timeSlot] || 0) + 1;
  });

  // Calculate risk level
  if (analysis.totalIncidents > 20) {
    analysis.riskLevel = 'high';
  } else if (analysis.totalIncidents > 10) {
    analysis.riskLevel = 'medium';
  }

  // Generate predictions
  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay();
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay];
  const timeSlot = currentHour < 6 ? 'night' : currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';

  if (analysis.patterns.byDayOfWeek[dayName] > 5) {
    analysis.predictions.push(`Higher incident rate typically observed on ${dayName}s`);
  }

  if (analysis.patterns.byTimeOfDay[timeSlot] > 3) {
    analysis.predictions.push(`Increased activity during ${timeSlot} hours`);
  }

  if (analysis.riskLevel === 'high') {
    analysis.predictions.push('This area has a high historical incident rate. Exercise extra caution.');
  }

  return analysis;
}

// Generate heatmap data
async function generateHeatmapData(bounds, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const incidents = await Incident.find({
    location: {
      $geoWithin: {
        $box: [
          [bounds.southwest.lng, bounds.southwest.lat],
          [bounds.northeast.lng, bounds.northeast.lat]
        ]
      }
    },
    createdAt: { $gte: startDate }
  });

  // Group incidents by grid cells for heatmap
  const gridSize = 0.01; // ~1km
  const heatmapData = {};

  incidents.forEach(incident => {
    const gridLat = Math.floor(incident.location.lat / gridSize) * gridSize;
    const gridLng = Math.floor(incident.location.lng / gridSize) * gridSize;
    const key = `${gridLat},${gridLng}`;

    if (!heatmapData[key]) {
      heatmapData[key] = {
        location: { lat: gridLat, lng: gridLng },
        count: 0,
        severity: { high: 0, medium: 0, low: 0 }
      };
    }

    heatmapData[key].count++;
    heatmapData[key].severity[incident.severity]++;
  });

  return Object.values(heatmapData).map(cell => ({
    ...cell,
    intensity: Math.min(cell.count / 10, 1) // Normalize to 0-1
  }));
}

module.exports = {
  analyzeHistoricalPatterns,
  generateHeatmapData
};

