require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./models/User');
const Poll = require('./models/Poll');
const ChatRoom = require('./models/ChatRoom');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Auth middleware
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ message: 'Please login to access this resource' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }
        
        if (!user.isActive) {
            return res.status(401).json({ message: 'Your account has been deactivated' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired. Please login again' });
        }
        res.status(401).json({ message: 'Not authorized' });
    }
};

// Admin middleware
const isAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Routes
app.use('/api/admin', protect, isAdmin, adminRoutes);

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // Validation
        if (!email || !password || !username) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Check existing user
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ 
                message: existingUser.email === email ? 
                    'Email already registered' : 
                    'Username already taken' 
            });
        }

        const user = await User.create({ email, password, username });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { 
            expiresIn: '30d',
            algorithm: 'HS256'
        });

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find user and check password
        const user = await User.findByEmailWithPassword(email);
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Your account has been deactivated' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { 
            expiresIn: '30d',
            algorithm: 'HS256'
        });

        // Update last login
        await user.updateLastLogin();

        // Remove password from response
        user.password = undefined;

        res.json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Poll Routes
app.get('/api/polls', async (req, res) => {
    try {
        const polls = await Poll.find({ status: 'active' })
            .populate('creator', 'username')
            .sort('-createdAt');
        res.json(polls);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching polls' });
    }
});

app.post('/api/polls', protect, async (req, res) => {
    try {
        const { title, description, options, endDate } = req.body;

        // Validation
        if (!title || !options || options.length < 2) {
            return res.status(400).json({ 
                message: 'Please provide a title and at least 2 options' 
            });
        }

        // Create poll
        const poll = await Poll.create({
            title,
            description,
            options: options.map(opt => ({ text: opt })),
            creator: req.user._id,
            endDate: endDate || null
        });

        // Populate creator info
        await poll.populate('creator', 'username');

        res.status(201).json(poll);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.post('/api/polls/:id/vote', protect, async (req, res) => {
    try {
        const { optionId } = req.body;
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        if (poll.status !== 'active') {
            return res.status(400).json({ message: 'Poll is not active' });
        }

        if (poll.votes.some(vote => vote.user.equals(req.user._id))) {
            return res.status(400).json({ message: 'You have already voted' });
        }

        const option = poll.options.id(optionId);
        if (!option) {
            return res.status(400).json({ message: 'Invalid option' });
        }

        option.votes += 1;
        poll.votes.push({ user: req.user._id, option: optionId });
        await poll.save();

        res.json(poll);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/polls/:id/close', protect, async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        if (!poll.creator.equals(req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        poll.status = 'closed';
        await poll.save();

        res.json(poll);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/polls/:id', protect, isAdmin, async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        await poll.remove();
        res.json({ message: 'Poll deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Chat Room Routes - IMPORTANT: Place these BEFORE Socket.IO setup
app.get('/api/chat/rooms', protect, async (req, res) => {
    try {
        const rooms = await ChatRoom.find({ 
            $or: [
                { type: 'public' },
                { type: 'private', members: req.user._id }
            ]
        })
        .populate('creator', 'username')
        .populate('moderators', 'username')
        .select('name description members type lastActivity settings moderators')
        .sort('-lastActivity');
        
        res.json(rooms);
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        res.status(500).json({ message: 'Error fetching chat rooms' });
    }
});

app.post('/api/chat/rooms', protect, async (req, res) => {
    try {
        const { name, description, type } = req.body;

        // Validate input
        if (!name || name.length < 3 || name.length > 30) {
            return res.status(400).json({ 
                message: 'Room name must be between 3 and 30 characters' 
            });
        }

        const room = await ChatRoom.create({
            name,
            description: description || '',
            type: type || 'public',
            creator: req.user._id,
            members: [req.user._id],
            moderators: [req.user._id], // Creator is automatically a moderator
            settings: {
                autoModeration: {
                    enabled: true,
                    blockedWords: ['spam', 'offensive', 'inappropriate']
                }
            }
        });

        // Populate creator info for response
        await room.populate('creator', 'username');
        await room.populate('moderators', 'username');

        res.status(201).json(room);
    } catch (error) {
        console.error('Error creating chat room:', error);
        res.status(400).json({ message: error.message });
    }
});

app.post('/api/chat/rooms/:roomId/join', protect, async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is banned
        if (room.isBanned(req.user._id)) {
            return res.status(403).json({ message: 'You are banned from this room' });
        }

        // Check if room is members-only
        if (room.settings?.membersOnly && !room.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'This room is for members only' });
        }

        // Check if user can join private room
        if (room.type === 'private' && !room.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Cannot join private room' });
        }

        // Add user to room if not already a member
        if (!room.members.includes(req.user._id)) {
            room.members.push(req.user._id);
            await room.save();
        }

        // Send room info with moderation status
        res.json({
            message: 'Joined room successfully',
            room: {
                _id: room._id,
                name: room.name,
                description: room.description,
                type: room.type,
                settings: room.settings,
                isModerator: room.isModerator(req.user._id)
            }
        });
    } catch (error) {
        console.error('Error joining chat room:', error);
        res.status(400).json({ message: error.message });
    }
});

// Moderation Routes
app.post('/api/chat/rooms/:roomId/moderators', protect, async (req, res) => {
    try {
        const { userId } = req.body;
        const room = await ChatRoom.findById(req.params.roomId);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is creator
        if (!room.creator.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only room creator can manage moderators' });
        }

        await room.addModerator(userId, req.user._id);
        await room.populate('moderators', 'username');

        // Notify room about new moderator
        io.to(room._id.toString()).emit('room_updated', {
            type: 'moderator_added',
            roomId: room._id,
            moderator: (await User.findById(userId)).username
        });

        res.json(room);
    } catch (error) {
        console.error('Error adding moderator:', error);
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/chat/rooms/:roomId/moderators/:userId', protect, async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.roomId);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is creator
        if (!room.creator.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only room creator can manage moderators' });
        }

        await room.removeModerator(req.params.userId, req.user._id);
        await room.populate('moderators', 'username');

        // Notify room about removed moderator
        io.to(room._id.toString()).emit('room_updated', {
            type: 'moderator_removed',
            roomId: room._id,
            moderator: (await User.findById(req.params.userId)).username
        });

        res.json(room);
    } catch (error) {
        console.error('Error removing moderator:', error);
        res.status(400).json({ message: error.message });
    }
});

app.post('/api/chat/rooms/:roomId/ban', protect, async (req, res) => {
    try {
        const { userId, reason } = req.body;
        const room = await ChatRoom.findById(req.params.roomId);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is moderator or creator
        if (!room.isModerator(req.user._id)) {
            return res.status(403).json({ message: 'Only moderators can ban users' });
        }

        // Cannot ban creator or moderators
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (room.creator.equals(userId) || room.moderators.includes(userId)) {
            return res.status(403).json({ message: 'Cannot ban creator or moderators' });
        }

        await room.banUser(userId, req.user._id, reason);

        // Notify room about banned user
        io.to(room._id.toString()).emit('room_updated', {
            type: 'user_banned',
            roomId: room._id,
            user: targetUser.username,
            reason
        });

        // Disconnect user from room if they're connected
        const userSocketId = Array.from(connectedUsers.entries())
            .find(([_, userData]) => userData.userId === userId)?.[0];
        
        if (userSocketId) {
            const socket = io.sockets.sockets.get(userSocketId);
            if (socket) {
                socket.leave(room._id.toString());
                socket.emit('force_leave_room', {
                    roomId: room._id,
                    reason: 'You have been banned from this room'
                });
            }
        }

        res.json({ message: 'User banned successfully' });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(400).json({ message: error.message });
    }
});

app.post('/api/chat/rooms/:roomId/unban', protect, async (req, res) => {
    try {
        const { userId } = req.body;
        const room = await ChatRoom.findById(req.params.roomId);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is moderator or creator
        if (!room.isModerator(req.user._id)) {
            return res.status(403).json({ message: 'Only moderators can unban users' });
        }

        await room.unbanUser(userId);

        // Notify room about unbanned user
        const targetUser = await User.findById(userId);
        io.to(room._id.toString()).emit('room_updated', {
            type: 'user_unbanned',
            roomId: room._id,
            user: targetUser.username
        });

        res.json({ message: 'User unbanned successfully' });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/chat/rooms/:roomId/settings', protect, async (req, res) => {
    try {
        const { settings } = req.body;
        const room = await ChatRoom.findById(req.params.roomId);

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is moderator or creator
        if (!room.isModerator(req.user._id)) {
            return res.status(403).json({ message: 'Only moderators can change room settings' });
        }

        // Update settings
        room.settings = {
            ...room.settings,
            ...settings
        };
        await room.save();

        // Notify room about settings update
        io.to(room._id.toString()).emit('room_updated', {
            type: 'settings_updated',
            roomId: room._id,
            settings: room.settings
        });

        res.json(room);
    } catch (error) {
        console.error('Error updating room settings:', error);
        res.status(400).json({ message: error.message });
    }
});

// Socket.IO setup
const connectedUsers = new Map();
const userRooms = new Map(); // Track user's active rooms
const lastMessageTime = new Map(); // Track last message time for slow mode

io.on('connection', (socket) => {
    // Handle user connection
    socket.on('user_connected', (userData) => {
        connectedUsers.set(socket.id, userData);
        userRooms.set(socket.id, new Set()); // Initialize empty set of rooms
        io.emit('users_online', connectedUsers.size);
        
        // Broadcast user joined message
        socket.broadcast.emit('chat_message', {
            userId: 'system',
            username: 'System',
            text: `${userData.username} joined the chat`,
            timestamp: new Date().toISOString(),
            type: 'system'
        });
    });

    // Handle joining room
    socket.on('join_room', async (roomId) => {
        try {
            const userData = connectedUsers.get(socket.id);
            if (!userData) return;

            const room = await ChatRoom.findById(roomId);
            if (!room) return;

            // Check if user is banned
            if (room.isBanned(userData.userId)) {
                socket.emit('error', {
                    message: 'You are banned from this room'
                });
                return;
            }

            // Check members-only setting
            if (room.settings.membersOnly && !room.members.includes(userData.userId)) {
                socket.emit('error', {
                    message: 'This room is for members only'
                });
                return;
            }

            // Join socket room
            socket.join(roomId);
            userRooms.get(socket.id).add(roomId);

            // Notify room about new user
            socket.to(roomId).emit('chat_message', {
                roomId,
                userId: 'system',
                username: 'System',
                text: `${userData.username} joined the room`,
                timestamp: new Date().toISOString(),
                type: 'system'
            });

            // Send room info back to user
            socket.emit('room_joined', {
                roomId,
                name: room.name,
                settings: room.settings,
                isModerator: room.isModerator(userData.userId)
            });
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', {
                message: 'Failed to join room'
            });
        }
    });

    // Handle chat messages
    socket.on('chat_message', async (message) => {
        try {
            // Validate message
            if (!message || !message.text || !message.userId || !message.username || !message.roomId) {
                return;
            }

            const userData = connectedUsers.get(socket.id);
            if (!userData) return;

            const room = await ChatRoom.findById(message.roomId);
            if (!room) return;

            // Check if user is banned
            if (room.isBanned(userData.userId)) {
                socket.emit('error', {
                    message: 'You are banned from this room'
                });
                return;
            }

            // Check slow mode
            if (room.settings.slowMode.enabled && !room.isModerator(userData.userId)) {
                const lastTime = lastMessageTime.get(`${room._id}-${userData.userId}`) || 0;
                const now = Date.now();
                const timeDiff = (now - lastTime) / 1000; // Convert to seconds

                if (timeDiff < room.settings.slowMode.delay) {
                    socket.emit('error', {
                        message: `Slow mode is enabled. Please wait ${Math.ceil(room.settings.slowMode.delay - timeDiff)} seconds.`
                    });
                    return;
                }
                lastMessageTime.set(`${room._id}-${userData.userId}`, now);
            }

            // Auto-moderate message if enabled
            if (room.settings.autoModeration.enabled && !room.isModerator(userData.userId)) {
                message.text = room.moderateMessage(message.text);
            }

            // Add server timestamp
            message.timestamp = new Date().toISOString();
            
            // Update room activity
            room.lastActivity = new Date();
            await room.save();
            
            // Broadcast to room
            io.to(message.roomId).emit('chat_message', message);
        } catch (error) {
            console.error('Error handling message:', error);
            socket.emit('error', {
                message: 'Failed to send message'
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const userData = connectedUsers.get(socket.id);
        if (userData) {
            // Leave all rooms
            const rooms = userRooms.get(socket.id);
            if (rooms) {
                rooms.forEach(roomId => {
                    socket.to(roomId).emit('chat_message', {
                        roomId,
                        userId: 'system',
                        username: 'System',
                        text: `${userData.username} left the room`,
                        timestamp: new Date().toISOString(),
                        type: 'system'
                    });
                });
            }
            
            connectedUsers.delete(socket.id);
            userRooms.delete(socket.id);
            io.emit('users_online', connectedUsers.size);
        }
    });
});

// MongoDB Connection with retry logic
async function connectDB(retries = 5) {
    try {
        console.log('Attempting to connect to MongoDB at:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✓ MongoDB Connected Successfully');
        console.log('✓ Database Name:', mongoose.connection.name);
        console.log('✓ Database Host:', mongoose.connection.host);
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.error('Error details:', {
            name: err.name,
            message: err.message,
            code: err.code,
            uri: process.env.MONGODB_URI
        });
        
        if (retries > 0) {
            console.log(`Retrying connection... (${retries} attempts remaining)`);
            setTimeout(() => connectDB(retries - 1), 5000);
        } else {
            console.error('Failed to connect to MongoDB after multiple retries');
            process.exit(1);
        }
    }
}

// Start server only after MongoDB connects
async function startServer() {
    try {
        await connectDB();
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
