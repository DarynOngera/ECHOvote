# Opinion Poll Platform

A real-time web-based opinion polling platform with peer-to-peer messaging capabilities and admin interface.

## Features
- Create and manage polls
- Real-time voting
- Live results visualization
- Peer-to-peer messaging
- Admin dashboard
- User authentication

## Prerequisites
- Node.js (v18 or higher)
- npm (comes with Node.js)

## Installation
1. Install Node.js from [https://nodejs.org/](https://nodejs.org/)
2. Clone this repository
3. Run `npm install` in both frontend and backend directories
4. Start the backend: `npm run start` in the backend directory
5. Start the frontend: `npm run start` in the frontend directory

## Project Structure
```
opinion-poll-platform/
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── styles/       # CSS styles
├── backend/               # Node.js backend
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── models/      # Data models
│   │   ├── routes/      # API routes
│   │   └── websocket/   # WebSocket handlers
└── README.md
```
