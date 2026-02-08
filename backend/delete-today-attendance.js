import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function deleteTodayAttendance() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');
    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staff');

    // Find test staff
    const testStaff = await Staff.findOne({ username: 'test_nurse' });
    
    if (!testStaff) {
      console.log('❌ Test staff not found');
      process.exit(1);
    }

    // Delete today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await Attendance.deleteMany({
      staff: testStaff._id,
      check_in: {
        $gte: today,
        $lt: tomorrow
      }
    });

    console.log(`\n✅ Deleted ${result.deletedCount} attendance records for today`);
    console.log('💡 Now you can click "Men keldim" again!');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteTodayAttendance();
