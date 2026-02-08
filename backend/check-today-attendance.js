import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function checkTodayAttendance() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');
    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staff');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendances = await Attendance.find({
      check_in: {
        $gte: today,
        $lt: tomorrow
      }
    });

    console.log(`\n📋 Found ${attendances.length} attendance records for today:\n`);
    
    for (const att of attendances) {
      const staff = await Staff.findById(att.staff);
      console.log(`👤 ${staff ? `${staff.first_name} ${staff.last_name} (${staff.username})` : 'Unknown'}`);
      console.log(`   Check-in: ${att.check_in}`);
      console.log(`   Check-out: ${att.check_out || 'Not yet'}`);
      console.log(`   Status: ${att.status}`);
      console.log(`   Staff ID: ${att.staff}`);
      console.log('');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTodayAttendance();
