# Opinion Poll Platform

A real-time web-based opinion poll platform built with Node.js, Express, MongoDB, and Socket.IO. Users can create polls, vote on existing polls, and engage in live chat discussions.

## Features

- User authentication with JWT
- Create and participate in polls
- Real-time poll results
- Live chat system
- Admin dashboard
- Responsive design with Bootstrap
- Real-time updates using WebSocket

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd opinion-poll-platform
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/opinion-poll-db
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

4. Start MongoDB service on your machine

5. Start the application:
```bash
npm start
```

## Project Structure

```
opinion-poll-platform/
├── public/
│   ├── js/
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── main.js
│   │   └── polls.js
│   ├── styles.css
│   └── index.html
├── models/
│   ├── User.js
│   └── Poll.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   └── polls.js
├── server.js
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user profile
- PUT `/api/auth/me` - Update user profile

### Polls
- GET `/api/polls` - Get all polls
- GET `/api/polls/:id` - Get single poll
- POST `/api/polls` - Create new poll
- POST `/api/polls/:id/vote` - Vote on a poll
- PUT `/api/polls/:id/close` - Close a poll
- DELETE `/api/polls/:id` - Delete a poll (admin only)

## WebSocket Events

### Client Events
- `user_connected` - Emitted when a user connects to chat
- `chat_message` - Emitted when a user sends a message

### Server Events
- `users_online` - Broadcast number of online users
- `chat_message` - Broadcast chat messages to all users

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Protected API routes
- Input validation
- XSS protection
- CORS enabled

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
