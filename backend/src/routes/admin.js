import express from 'express';
import { adminAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import Poll from '../models/Poll.js';

const router = express.Router();

// Apply admin authentication middleware to all routes
router.use(adminAuth);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all polls with detailed information
router.get('/polls', async (req, res) => {
  try {
    const polls = await Poll.find()
      .sort({ createdAt: -1 });
    res.json(polls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [users, polls] = await Promise.all([
      User.countDocuments(),
      Poll.find()
    ]);

    const stats = {
      totalUsers: users,
      totalPolls: polls.length,
      activePolls: polls.filter(poll => poll.active).length,
      totalVotes: polls.reduce((sum, poll) => sum + (poll.totalVotes || 0), 0)
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
