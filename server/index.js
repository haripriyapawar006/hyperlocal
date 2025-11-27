const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hyperlocal-emergency', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/sos', require('./routes/sos'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/geofences', require('./routes/geofences'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/user', require('./routes/user'));

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-location', (location) => {
    if (!location?.lat || !location?.lng) return;
    const room = `location-${Math.floor(location.lat * 100)}-${Math.floor(location.lng * 100)}`;
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });

  socket.on('join-user', (userId) => {
    if (!userId) return;
    const room = `user-${userId}`;
    socket.join(room);
    console.log(`User ${socket.id} joined user room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

