const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    address: String
  },
  radius: {
    type: Number,
    required: true,
    default: 500 // meters
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastAlerted: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

geofenceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Geofence', geofenceSchema);

