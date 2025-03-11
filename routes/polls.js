const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const { protect, isAdmin } = require('../middleware/auth');

// Create new poll
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, options, endDate } = req.body;
    const poll = await Poll.create({
      title,
      description,
      options: options.map(opt => ({ text: opt })),
      creator: req.user._id,
      endDate
    });
    
    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ message: 'Error creating poll', error: error.message });
  }
});

// Get all polls
router.get('/', async (req, res) => {
  try {
    const polls = await Poll.find({ status: 'active' })
      .populate('creator', 'username')
      .sort('-createdAt');
    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching polls', error: error.message });
  }
});

// Get single poll
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('creator', 'username')
      .populate('voters.user', 'username');
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching poll', error: error.message });
  }
});

// Vote on a poll
router.post('/:id/vote', protect, async (req, res) => {
  try {
    const { choice } = req.body;
    const poll = await Poll.findById(req.params.id);
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    if (poll.status !== 'active') {
      return res.status(400).json({ message: 'Poll is not active' });
    }
    
    if (poll.hasVoted(req.user._id)) {
      return res.status(400).json({ message: 'Already voted on this poll' });
    }
    
    // Add vote
    poll.options[choice].votes += 1;
    poll.voters.push({
      user: req.user._id,
      choice
    });
    
    await poll.save();
    
    // Get updated results
    const results = poll.getResults();
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Error voting on poll', error: error.message });
  }
});

// Close poll (creator or admin only)
router.put('/:id/close', protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    if (poll.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to close this poll' });
    }
    
    poll.status = 'closed';
    await poll.save();
    
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: 'Error closing poll', error: error.message });
  }
});

// Delete poll (admin only)
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    poll.status = 'deleted';
    await poll.save();
    
    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting poll', error: error.message });
  }
});

module.exports = router;
