require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const adminData = {
      email: 'admin@thriftbot.com',
      password: 'admin123456', // Change this in production!
      name: 'Super Admin',
      role: 'super_admin',
      permissions: ['users', 'groups', 'transactions', 'reports', 'settings', 'messaging']
    };

    const existingAdmin = await Admin.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log('Admin already exists with email:', adminData.email);
      process.exit(0);
    }

    const admin = new Admin(adminData);
    await admin.save();
    
    console.log('Super admin created successfully!');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
