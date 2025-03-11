const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, 'Option text is required'],
        trim: true,
        minlength: [1, 'Option text cannot be empty'],
        maxlength: [200, 'Option text cannot exceed 200 characters']
    },
    votes: {
        type: Number,
        default: 0,
        min: [0, 'Votes cannot be negative']
    }
});

const pollSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Poll title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters long'],
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    options: {
        type: [optionSchema],
        validate: {
            validator: function(options) {
                return options.length >= 2;
            },
            message: 'Poll must have at least 2 options'
        }
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required'],
        index: true
    },
    voters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    status: {
        type: String,
        enum: {
            values: ['active', 'closed', 'deleted'],
            message: '{VALUE} is not a valid status'
        },
        default: 'active',
        index: true
    },
    endDate: {
        type: Date,
        validate: {
            validator: function(value) {
                return !value || value > new Date();
            },
            message: 'End date must be in the future'
        }
    },
    totalVotes: {
        type: Number,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes for better query performance
pollSchema.index({ status: 1, createdAt: -1 });
pollSchema.index({ endDate: 1 }, { sparse: true });

// Pre-save middleware to update totalVotes
pollSchema.pre('save', function(next) {
    if (this.isModified('options')) {
        this.totalVotes = this.options.reduce((sum, option) => sum + option.votes, 0);
    }
    next();
});

// Method to check if a user has voted
pollSchema.methods.hasVoted = function(userId) {
    return this.voters.includes(userId);
};

// Method to add a vote
pollSchema.methods.addVote = async function(userId, optionId) {
    if (this.hasVoted(userId)) {
        throw new Error('User has already voted on this poll');
    }
    
    if (this.status !== 'active') {
        throw new Error('Poll is not active');
    }
    
    if (this.endDate && new Date() > this.endDate) {
        this.status = 'closed';
        await this.save();
        throw new Error('Poll has ended');
    }

    const option = this.options.id(optionId);
    if (!option) {
        throw new Error('Invalid option');
    }

    option.votes += 1;
    this.voters.push(userId);
    this.totalVotes += 1;
    
    return this.save();
};

// Method to get poll results
pollSchema.methods.getResults = function() {
    return this.options.map(option => ({
        _id: option._id,
        text: option.text,
        votes: option.votes,
        percentage: this.totalVotes > 0 ? 
            Number((option.votes / this.totalVotes * 100).toFixed(2)) : 
            0
    }));
};

// Static method to get active polls
pollSchema.statics.getActivePolls = function() {
    return this.find({
        status: 'active',
        $or: [
            { endDate: { $exists: false } },
            { endDate: { $gt: new Date() } }
        ]
    }).sort('-createdAt');
};

// Virtual for time remaining
pollSchema.virtual('timeRemaining').get(function() {
    if (!this.endDate) return null;
    const now = new Date();
    return this.endDate > now ? this.endDate - now : 0;
});

const Poll = mongoose.model('Poll', pollSchema);

// Create indexes
Poll.createIndexes().catch(console.error);

module.exports = Poll;
