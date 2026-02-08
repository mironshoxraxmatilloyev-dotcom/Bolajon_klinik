/**
 * CHECK RECEPTION ATTENDANCE
 * Qabulxonachi uchun barcha attendance'larni ko'rish
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendance');
const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staffs');

async function checkReceptionAttendance() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Find reception staff
    const staff = await Staff.findOne({ username: 'qabulxona' });
    
    if (!staff) {
      console.log('❌ Qabulxonachi topilmadi!');
      await mongoose.disconnect();
      return;
    }

    console.log('👤 Found staff:', staff.first_name, staff.last_name);
    console.log('🆔 ID:', staff._id);

    // Find all attendance
    const attendances = await Attendance.find({
      staff: staff._id
    }).sort({ check_in: -1 }).limit(10);

    console.log('\n📋 Found', attendances.length, 'attendance record(s) (last 10):\n');

    if (attendances.length === 0) {
      console.log('✅ No attendance records');
    } else {
      attendances.forEach((att, index) => {
        console.log(`${index + 1}. Attendance ID: ${att._id}`);
        console.log(`   Check-in: ${att.check_in} (${att.check_in.toLocaleString('uz-UZ')})`);
        console.log(`   Check-out: ${att.check_out ? att.check_out + ' (' + att.check_out.toLocaleString('uz-UZ') + ')' : 'Not checked out'}`);
        console.log(`   Status: ${att.status}`);
        console.log(`   Duration: ${att.work_duration || 0} minutes\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkReceptionAttendance();
