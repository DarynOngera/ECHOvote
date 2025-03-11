const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Room name is required'],
        trim: true,
        minlength: [3, 'Room name must be at least 3 characters long'],
        maxlength: [30, 'Room name cannot exceed 30 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters']
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    moderators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    bannedUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        bannedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        bannedAt: {
            type: Date,
            default: Date.now
        }
    }],
    settings: {
        slowMode: {
            enabled: {
                type: Boolean,
                default: false
            },
            delay: {
                type: Number,
                default: 5,
                min: 1,
                max: 300
            }
        },
        membersOnly: {
            type: Boolean,
            default: false
        },
        autoModeration: {
            enabled: {
                type: Boolean,
                default: true
            },
            blockedWords: [{
                type: String,
                trim: true
            }]
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
});

// Update lastActivity when new messages are sent
chatRoomSchema.methods.updateActivity = function() {
    this.lastActivity = new Date();
    return this.save();
};

// Check if a user is a moderator
chatRoomSchema.methods.isModerator = function(userId) {
    return this.moderators.some(mod => mod.equals(userId)) || 
           this.creator.equals(userId);
};

// Check if a user is banned
chatRoomSchema.methods.isBanned = function(userId) {
    return this.bannedUsers.some(ban => ban.user.equals(userId));
};

// Add a moderator
chatRoomSchema.methods.addModerator = async function(userId, addedBy) {
    if (!this.moderators.includes(userId)) {
        this.moderators.push(userId);
        await this.save();
    }
};

// Remove a moderator
chatRoomSchema.methods.removeModerator = async function(userId, removedBy) {
    this.moderators = this.moderators.filter(mod => !mod.equals(userId));
    await this.save();
};

// Ban a user
chatRoomSchema.methods.banUser = async function(userId, bannedBy, reason) {
    if (!this.isBanned(userId)) {
        this.bannedUsers.push({
            user: userId,
            bannedBy,
            reason
        });
        // Remove user from members if they're in it
        this.members = this.members.filter(member => !member.equals(userId));
        await this.save();
    }
};

// Unban a user
chatRoomSchema.methods.unbanUser = async function(userId) {
    this.bannedUsers = this.bannedUsers.filter(ban => !ban.user.equals(userId));
    await this.save();
};

// Auto-moderate a message
chatRoomSchema.methods.moderateMessage = function(message) {
    if (!this.settings.autoModeration.enabled) return message;

    let moderatedText = message;
    this.settings.autoModeration.blockedWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        moderatedText = moderatedText.replace(regex, '*'.repeat(word.length));
    });
    return moderatedText;
};

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
module.exports = ChatRoom;
