import express from 'express';
import { auth } from '../middleware/auth.js';
import Poll from '../models/Poll.js';

const router = express.Router();

// Middleware to verify token
router.use(auth);

// Get all polls
router.get('/', async (req, res) => {
  try {
    const polls = await Poll.find({ active: true })
      .sort({ createdAt: -1 });
    res.json(polls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

// Create a new poll
router.post('/', async (req, res) => {
  try {
    const { question, options, endDate } = req.body;
    
    // Validation
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ 
        error: 'Question and at least two options are required' 
      });
    }

    const poll = new Poll({
      question,
      options: options.map(text => ({ text })),
      creator: req.user.email,
      endDate: endDate || null
    });

    await poll.save();
    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Get a specific poll
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    res.json(poll);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// Vote on a poll
router.post('/:id/vote', async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.hasEnded()) {
      return res.status(400).json({ error: 'Poll has ended' });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }

    try {
      poll.addVote(optionIndex, req.user.email);
      await poll.save();
      res.json(poll);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to register vote' });
  }
});

// Close a poll (creator only)
router.patch('/:id/close', async (req, res) => {
  try {
    const poll = await Poll.findOne({
      _id: req.params.id,
      creator: req.user.email
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    poll.active = false;
    await poll.save();
    res.json(poll);
  } catch (error) {
    res.status(500).json({ error: 'Failed to close poll' });
  }
});

// Delete a poll (creator only)
router.delete('/:id', async (req, res) => {
  try {
    const poll = await Poll.findOneAndDelete({
      _id: req.params.id,
      creator: req.user.email
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

export default router;
