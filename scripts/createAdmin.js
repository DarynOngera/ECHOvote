require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        const adminData = {
            email: 'admin@polls.com',
            password: 'Admin@123456',
            username: 'admin',
            role: 'admin'
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create(adminData);
        console.log('Admin user created successfully');
        console.log('Email:', admin.email);
        console.log('Password: Admin@123456');
        
    } catch (error) {
        console.error('Error creating admin:', error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();
