const express = require('express');
const Contact = require('../models/Contact');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all contacts
router.get('/', auth, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.userId })
      .sort({ isFavourite: -1, name: 1 });
    
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add contact
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, isFavourite, notificationMethods } = req.body;
    
    const contact = new Contact({
      userId: req.userId,
      name,
      email,
      phone,
      isFavourite: isFavourite || false,
      notificationMethods: notificationMethods || {
        email: !!email,
        sms: !!phone,
        inApp: true
      }
    });

    await contact.save();
    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update contact
router.put('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    Object.assign(contact, req.body);
    await contact.save();
    
    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete contact
router.delete('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    await contact.deleteOne();
    res.json({ message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

