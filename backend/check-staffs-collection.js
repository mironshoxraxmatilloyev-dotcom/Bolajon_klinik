import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function checkStaffsCollection() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read directly from staffs collection
    const staffs = await mongoose.connection.db.collection('staffs').find({}).toArray();
    
    console.log(`\n📋 Found ${staffs.length} staff in 'staffs' collection:\n`);
    
    staffs.forEach((staff, i) => {
      console.log(`${i + 1}. ${staff.first_name} ${staff.last_name}`);
      console.log(`   Username: ${staff.username}`);
      console.log(`   Role: ${staff.role}`);
      console.log(`   ID: ${staff._id}`);
      console.log('');
    });

    // Now check staff_salaries
    const salaries = await mongoose.connection.db.collection('staff_salaries').find({}).toArray();
    console.log(`\n💰 Found ${salaries.length} salaries:\n`);
    
    for (const salary of salaries) {
      const staff = staffs.find(s => s._id.toString() === salary.staff_id.toString());
      console.log(`${staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown'}`);
      console.log(`   Work time: ${salary.work_start_time || 'NOT SET'} - ${salary.work_end_time || 'NOT SET'}`);
      console.log(`   Base salary: ${salary.base_salary || 0}`);
      console.log(`   Hours/month: ${salary.work_hours_per_month || 0}`);
      console.log('');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStaffsCollection();
