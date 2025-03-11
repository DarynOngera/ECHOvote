const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Poll = require('../models/Poll');

// Admin middleware
const isAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Get dashboard overview
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalUsers, activePolls, totalVotes, newPollsThisMonth] = await Promise.all([
            User.countDocuments(),
            Poll.countDocuments({ status: 'active' }),
            Poll.aggregate([
                { $match: { status: { $ne: 'deleted' } } },
                { $group: { _id: null, total: { $sum: '$totalVotes' } } }
            ]),
            Poll.countDocuments({ 
                createdAt: { $gte: startOfMonth },
                status: { $ne: 'deleted' }
            })
        ]);

        res.json({
            totalUsers,
            activePolls,
            totalVotes: totalVotes[0]?.total || 0,
            newPollsThisMonth
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all users
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .populate({
                path: 'createdPolls',
                match: { status: { $ne: 'deleted' } }
            })
            .sort('-createdAt');

        res.json(users.map(user => ({
            _id: user._id,
            username: user.username,
            email: user.email,
            isActive: user.isActive,
            role: user.role,
            createdPolls: user.createdPolls || [],
            lastLogin: user.lastLogin || user.createdAt,
            createdAt: user.createdAt
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user status
router.put('/users/:id/status', isAdmin, async (req, res) => {
    try {
        const { isActive } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot modify admin status' });
        }
        
        user.isActive = isActive;
        await user.save();
        
        res.json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all polls
router.get('/polls', isAdmin, async (req, res) => {
    try {
        const polls = await Poll.find({ status: { $ne: 'deleted' } })
            .populate('creator', 'username')
            .sort('-createdAt');

        res.json(polls.map(poll => ({
            _id: poll._id,
            title: poll.title,
            creator: poll.creator,
            status: poll.status,
            totalVotes: poll.options.reduce((sum, opt) => sum + opt.votes, 0),
            createdAt: poll.createdAt
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update poll status
router.put('/polls/:id/status', isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'closed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const poll = await Poll.findById(req.params.id);
        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }
        
        poll.status = status;
        await poll.save();
        
        res.json({ message: `Poll ${status === 'closed' ? 'closed' : 'activated'} successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete poll
router.delete('/polls/:id', isAdmin, async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }
        
        poll.status = 'deleted';
        await poll.save();
        
        res.json({ message: 'Poll deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get analytics data
router.get('/analytics', isAdmin, async (req, res) => {
    try {
        const now = new Date();
        const past6Months = new Date(now.setMonth(now.getMonth() - 6));
        
        // User growth over past 6 months
        const userGrowth = await User.aggregate([
            {
                $match: { createdAt: { $gte: past6Months } }
            },
            {
                $group: {
                    _id: { 
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Poll activity over past 6 months
        const pollActivity = await Poll.aggregate([
            {
                $match: { 
                    createdAt: { $gte: past6Months },
                    status: { $ne: 'deleted' }
                }
            },
            {
                $group: {
                    _id: { 
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Active vs Inactive users
        const [activeUsers, inactiveUsers] = await Promise.all([
            User.countDocuments({ isActive: true }),
            User.countDocuments({ isActive: false })
        ]);

        // Poll categories (using title words as simple categorization)
        const pollCategories = await Poll.aggregate([
            {
                $match: { status: { $ne: 'deleted' } }
            },
            {
                $project: {
                    category: {
                        $arrayElemAt: [{ $split: ['$title', ' '] }, 0]
                    }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Format data for charts
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        res.json({
            userGrowth: {
                labels: userGrowth.map(g => `${months[g._id.month - 1]} ${g._id.year}`),
                data: userGrowth.map(g => g.count)
            },
            pollActivity: {
                labels: pollActivity.map(p => `${months[p._id.month - 1]} ${p._id.year}`),
                data: pollActivity.map(p => p.count)
            },
            activeUsers,
            inactiveUsers,
            pollCategories: {
                labels: pollCategories.map(c => c._id),
                data: pollCategories.map(c => c.count)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
