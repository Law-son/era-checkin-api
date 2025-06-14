require('dotenv').config();
const Admin = require('../models/admin.model');
const connection = require('../config/db');

const createSuperAdmin = async () => {
  try {
    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ email: 'superadmin@gmail.com' });
    
    if (existingAdmin) {
      console.log('Super admin already exists!');
      process.exit(0);
    }

    // Create super admin
    const superAdmin = await Admin.create({
      email: 'superadmin@gmail.com',
      password: 'Admin@123',
      fullName: 'Super Admin',
      role: 'superadmin',
      status: 'active'
    });

    console.log('Super admin created successfully:', {
      email: superAdmin.email,
      fullName: superAdmin.fullName,
      role: superAdmin.role
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error.message);
    process.exit(1);
  }
};

createSuperAdmin(); 