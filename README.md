# Hyperlocal Emergency Alert Wall

A full-stack web application for real-time emergency alerts and incident reporting in local communities.

## Features

1. **One-Gesture Instant SOS Trigger** - Shake, double-tap, or volume button press to send SOS
2. **One-Tap Incident Pinning** - Quick incident reporting with multimedia support
3. **Real-Time Map with Live Alerts** - Dynamic map showing nearby incidents
4. **Severity-Based Colour Coding** - Red/Yellow/Green indicators
5. **Live Community Feed** - Scrolling feed of recent incidents
6. **Location Auto-Detection** - Automatic geolocation
7. **Quick Reaction Buttons** - Confirm/deny/add info to alerts
8. **Safe Routes** - Route suggestions avoiding hazards
9. **Favourite Contacts Alerting** - Instant SOS notifications
10. **Geofence Danger Notifications** - Radius-based alerts
11. **Multimedia Evidence Upload** - Photo/video/audio attachments
12. **Incident Confidence Score** - Reliability scoring
13. **Historical Incident Intelligence** - Pattern analysis
14. **Predictive Danger Heatmap** - Risk zone visualization

## Tech Stack

- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Frontend**: React, Leaflet Maps, WebSocket
- **File Upload**: Multer
- **Authentication**: JWT

## Setup

1. Install dependencies:
```bash
npm run install-all
```

2. Set up environment variables (create `.env` file):
```
MONGODB_URI=mongodb://localhost:27017/hyperlocal-emergency
JWT_SECRET=your-secret-key
PORT=5000
CLIENT_URL=http://localhost:3000
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

3. Start MongoDB (if running locally)

4. Run the application:
```bash
npm run dev
```

The backend will run on `http://localhost:5000` and frontend on `http://localhost:3000`

## Project Structure

```
├── server/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── utils/           # Utility functions
│   └── index.js         # Server entry point
├── client/              # React frontend
└── uploads/             # Uploaded media files
```

