import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/opinion-poll';
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      return;
    }

    const adminUser = new User({
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });

    await adminUser.save();
    console.log('\x1b[32m%s\x1b[0m', 'Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('\x1b[33m%s\x1b[0m', 'Please change the password after first login!');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error creating admin user:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdminUser();
