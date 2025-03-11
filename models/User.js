const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
        index: { unique: true, name: 'email_unique' }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Don't include password in normal queries
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'],
        index: { unique: true, name: 'username_unique' }
    },
    role: {
        type: String,
        enum: {
            values: ['user', 'admin'],
            message: '{VALUE} is not a valid role'
        },
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    createdPolls: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll'
    }],
    votedPolls: [{
        poll: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Poll'
        },
        choice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Poll.options'
        },
        votedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true, // Adds updatedAt field
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.__v;
            return ret;
        }
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update lastLogin timestamp
userSchema.methods.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return this.save();
};

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
};

// Method to check if user has voted on a poll
userSchema.methods.hasVotedOnPoll = function(pollId) {
    return this.votedPolls.some(vote => vote.poll.toString() === pollId.toString());
};

// Static method to find by email with password
userSchema.statics.findByEmailWithPassword = function(email) {
    return this.findOne({ email }).select('+password');
};

const User = mongoose.model('User', userSchema);

// Create indexes
User.createIndexes().catch(console.error);

module.exports = User;
