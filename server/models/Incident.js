const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['accident', 'fire', 'unsafe_area', 'medical', 'crime', 'natural_disaster', 'other']
  },
  severity: {
    type: String,
    required: true,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
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
  description: {
    type: String
  },
  media: [{
    type: {
      type: String,
      enum: ['photo', 'video', 'audio']
    },
    url: String,
    filename: String
  }],
  confidence: {
    score: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    confirmations: {
      type: Number,
      default: 0
    },
    denials: {
      type: Number,
      default: 0
    },
    verifiedBy: [{
      userId: mongoose.Schema.Types.ObjectId,
      action: {
        type: String,
        enum: ['confirm', 'deny']
      }
    }]
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'false_alarm'],
    default: 'active'
  },
  resolvedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);

