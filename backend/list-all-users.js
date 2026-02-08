import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function listAllUsers() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staff');

    const allStaff = await Staff.find({});
    
    console.log(`\n📋 Found ${allStaff.length} users:\n`);
    
    allStaff.forEach((staff, i) => {
      console.log(`${i + 1}. ${staff.first_name} ${staff.last_name}`);
      console.log(`   Username: ${staff.username}`);
      console.log(`   Role: ${staff.role}`);
      console.log(`   ID: ${staff._id}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listAllUsers();
