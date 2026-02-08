/**
 * TEST PENALTY FLOW
 * 1. Delete today's attendance for laborant
 * 2. Check penalties before
 * 3. User should click "Men keldim" in frontend
 * 4. Check penalties after
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

// Models
const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendance');
const Penalty = mongoose.model('Penalty', new mongoose.Schema({}, { strict: false }), 'penalties');

async function testPenaltyFlow() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    const laborantId = '6981dae9e338bf243fd14bbf';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Step 1: Delete today's attendance
    console.log('📋 Step 1: Deleting today\'s attendance for laborant...');
    const deleteResult = await Attendance.deleteMany({
      staff_id: new mongoose.Types.ObjectId(laborantId),
      date: { $gte: today, $lt: tomorrow }
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} attendance record(s)\n`);

    // Step 2: Check penalties before
    console.log('📋 Step 2: Checking penalties before...');
    const penaltiesBefore = await Penalty.find({
      staff_id: new mongoose.Types.ObjectId(laborantId)
    }).sort({ created_at: -1 }).limit(5);
    console.log(`Found ${penaltiesBefore.length} penalties:`);
    penaltiesBefore.forEach(p => {
      console.log(`  - ${p.penalty_type}: ${p.amount} so'm (${p.status}) - ${p.reason}`);
    });
    console.log('\n');

    console.log('✅ Test setup complete!');
    console.log('\n📱 NOW:');
    console.log('1. Login as laborant (username: laborant, password: admin123)');
    console.log('2. Go to "Mening Vazifalarim" page');
    console.log('3. Click "Men keldim" button (you should be late)');
    console.log('4. Check backend console for penalty creation logs');
    console.log('5. Login as admin and check "Maosh Boshqaruvi" -> "Jarimalar" tab');
    console.log('6. You should see the penalty in "Tasdiqlash kutilmoqda" section');
    console.log('7. Approve the penalty');
    console.log('8. Login as laborant again and check "Mening Maoshim" -> "Bonuslar" tab');
    console.log('9. You should see the penalty in both "Tasdiqlash kutilmoqda" and "Tasdiqlangan jarimalar" sections\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

testPenaltyFlow();
