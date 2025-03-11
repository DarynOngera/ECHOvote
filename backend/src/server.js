import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { networkInterfaces } from 'os';
import authRoutes from './routes/auth.js';
import pollRoutes from './routes/polls.js';
import adminRoutes from './routes/admin.js';
import { verifyToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/opinion-poll';

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/admin', adminRoutes);

// Create HTTP server
const httpServer = createServer(app);

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO middleware for authentication
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const user = verifyToken(token);
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// Socket.IO event handlers
io.on('connection', async (socket) => {
  console.log('User connected:', socket.user.email);

  // Send previous messages
  try {
    const messageSchema = new mongoose.Schema({
      content: {
        type: String,
        required: true,
        trim: true
      },
      sender: {
        type: String,
        required: true
      },
      timestamp: { 
        type: Date, 
        default: Date.now 
      }
    });

    const Message = mongoose.model('Message', messageSchema);

    const previousMessages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    socket.emit('previousMessages', previousMessages.reverse());
  } catch (err) {
    console.error('Error fetching previous messages:', err);
  }

  // Handle new messages
  socket.on('message', async (messageData) => {
    try {
      const messageSchema = new mongoose.Schema({
        content: {
          type: String,
          required: true,
          trim: true
        },
        sender: {
          type: String,
          required: true
        },
        timestamp: { 
          type: Date, 
          default: Date.now 
        }
      });

      const Message = mongoose.model('Message', messageSchema);

      const message = new Message({
        content: messageData.content,
        sender: socket.user.email
      });
      await message.save();
      io.emit('message', {
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp
      });
    } catch (err) {
      console.error('Error saving message:', err);
      socket.emit('error', 'Failed to save message');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.email);
  });
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Listen on all network interfaces (0.0.0.0)
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`\nServer is running on port ${PORT}`);
      
      // Get and display all network addresses
      const nets = networkInterfaces();
      console.log('\nAccess URLs:');
      console.log('-----------');
      console.log(`Local: http://localhost:${PORT}`);
      
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Skip over non-IPv4 and internal addresses
          if (net.family === 'IPv4' && !net.internal) {
            console.log(`Network: http://${net.address}:${PORT}`);
          }
        }
      }
      console.log('-----------\n');
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
