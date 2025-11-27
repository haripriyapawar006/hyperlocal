const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  contactsNotified: [{
    contactId: mongoose.Schema.Types.ObjectId,
    method: String,
    status: String,
    notifiedAt: Date
  }],
  nearbyRespondersNotified: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active'
  },
  resolvedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

sosAlertSchema.index({ location: '2dsphere' });
sosAlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SOSAlert', sosAlertSchema);

