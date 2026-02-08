/**
 * DELETE RECEPTION ATTENDANCE
 * Qabulxonachi uchun bugungi attendance'ni o'chirish
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendance');
const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staffs');

async function deleteReceptionAttendance() {
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

    // Get today's date range (local time)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    console.log('\n📅 Date range (local time):');
    console.log('   Today:', today.toLocaleString('uz-UZ'));
    console.log('   Tomorrow:', tomorrow.toLocaleString('uz-UZ'));
    console.log('\n📅 Date range (UTC):');
    console.log('   From:', today);
    console.log('   To:', tomorrow);

    // Find today's attendance
    const attendance = await Attendance.find({
      staff: staff._id,
      check_in: {
        $gte: today,
        $lt: tomorrow
      }
    });

    console.log('\n📋 Found', attendance.length, 'attendance record(s)');

    if (attendance.length === 0) {
      console.log('✅ No attendance to delete');
      await mongoose.disconnect();
      return;
    }

    // Show attendance details
    attendance.forEach((att, index) => {
      console.log(`\n${index + 1}. Attendance:`);
      console.log('   Check-in:', att.check_in);
      console.log('   Check-out:', att.check_out || 'Not checked out');
      console.log('   Status:', att.status);
    });

    // Delete attendance
    console.log('\n🗑️  Deleting attendance...');
    const result = await Attendance.deleteMany({
      staff: staff._id,
      check_in: {
        $gte: today,
        $lt: tomorrow
      }
    });

    console.log('✅ Deleted', result.deletedCount, 'attendance record(s)');
    console.log('\n✅ Tayyor! Endi "Men keldim" tugmasi paydo bo\'ladi.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

deleteReceptionAttendance();
