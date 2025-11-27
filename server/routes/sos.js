const express = require('express');
const SOSAlert = require('../models/SOSAlert');
const Contact = require('../models/Contact');
const Incident = require('../models/Incident');
const User = require('../models/User');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const router = express.Router();

// Email transporter (configure with your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send SOS alert
router.post('/', auth, async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create SOS alert
    const sosAlert = new SOSAlert({
      userId: req.userId,
      location: { lat: parseFloat(lat), lng: parseFloat(lng), address }
    });

    // Get favourite contacts
    const contacts = await Contact.find({ 
      userId: req.userId, 
      isFavourite: true 
    });

    const contactsNotified = [];

    // Notify contacts
    for (const contact of contacts) {
      const notification = {
        contactId: contact._id,
        method: '',
        status: 'pending',
        notifiedAt: new Date()
      };

      // Email notification
      if (contact.notificationMethods.email && contact.email) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: contact.email,
            subject: `🚨 SOS Alert from ${user.name}`,
            html: `
              <h2>Emergency SOS Alert</h2>
              <p><strong>${user.name}</strong> has triggered an SOS alert!</p>
              <p><strong>Location:</strong> ${address || `${lat}, ${lng}`}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p><a href="https://maps.google.com/?q=${lat},${lng}">View Location on Map</a></p>
            `
          });
          notification.method = 'email';
          notification.status = 'sent';
        } catch (error) {
          notification.status = 'failed';
        }
      }

      // SMS notification (requires Twilio setup)
      if (contact.notificationMethods.sms && contact.phone) {
        // Twilio SMS code would go here
        // For now, we'll just mark it
        notification.method = notification.method ? 'email+sms' : 'sms';
      }

      contactsNotified.push(notification);
    }

    sosAlert.contactsNotified = contactsNotified;

    // Find nearby users (within 2km) to notify
    const nearbyUsers = await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 2000 // 2km
        }
      },
      _id: { $ne: req.userId }
    }).limit(50);

    sosAlert.nearbyRespondersNotified = nearbyUsers.length;

    await sosAlert.save();

    // Emit real-time SOS alert
    const io = req.app.get('io');
    io.emit('sos-alert', {
      alert: sosAlert,
      user: { name: user.name, id: user._id },
      location: sosAlert.location
    });

    // Also create an incident automatically
    const incident = new Incident({
      userId: req.userId,
      type: 'other',
      severity: 'high',
      location: sosAlert.location,
      description: `SOS Alert triggered by ${user.name}`,
      confidence: {
        score: 100,
        confirmations: 1
      }
    });

    await incident.save();
    io.emit('new-incident', incident);

    res.json({ sosAlert, incident, contactsNotified: contactsNotified.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's SOS alerts
router.get('/my-alerts', auth, async (req, res) => {
  try {
    const alerts = await SOSAlert.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

