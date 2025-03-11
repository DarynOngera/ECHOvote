import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    votes: {
      type: Number,
      default: 0
    }
  }],
  creator: {
    type: String,
    required: true
  },
  endDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  voters: [{
    email: String,
    votedAt: Date
  }]
});

// Method to check if a user has already voted
pollSchema.methods.hasUserVoted = function(userEmail) {
  return this.voters.some(voter => voter.email === userEmail);
};

// Method to add a vote
pollSchema.methods.addVote = function(optionIndex, userEmail) {
  if (this.hasUserVoted(userEmail)) {
    throw new Error('User has already voted on this poll');
  }

  this.options[optionIndex].votes += 1;
  this.totalVotes += 1;
  this.voters.push({
    email: userEmail,
    votedAt: new Date()
  });
};

// Method to check if poll has ended
pollSchema.methods.hasEnded = function() {
  if (!this.active) return true;
  if (this.endDate && new Date() > this.endDate) {
    this.active = false;
    return true;
  }
  return false;
};

const Poll = mongoose.model('Poll', pollSchema);

export default Poll;
