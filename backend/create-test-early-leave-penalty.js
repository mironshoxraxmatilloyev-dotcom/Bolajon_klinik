import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function createTestPenalty() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staff');
    const StaffSalary = mongoose.model('StaffSalary', new mongoose.Schema({}, { strict: false }), 'staff_salaries');
    const Penalty = mongoose.model('Penalty', new mongoose.Schema({}, { strict: false }), 'penalties');

    // Find test staff
    const testStaff = await Staff.findOne({ username: 'test_nurse' });
    
    if (!testStaff) {
      console.log('❌ Test staff not found. Run create-test-staff-with-schedule.js first');
      process.exit(1);
    }

    const salary = await StaffSalary.findOne({ staff_id: testStaff._id });
    
    if (!salary) {
      console.log('❌ Salary not found');
      process.exit(1);
    }

    // Calculate penalty for 45 minutes early leave
    const earlyMinutes = 45;
    const hourlyRate = salary.base_salary / salary.work_hours_per_month;
    const penaltyAmount = Math.round(hourlyRate * (earlyMinutes / 60));

    // Create pending penalty
    const currentDate = new Date();
    const penalty = await Penalty.create({
      staff_id: testStaff._id,
      amount: penaltyAmount,
      reason: `Erta ketish: ${earlyMinutes} daqiqa (18:00 o'rniga 17:15 da ketdi)`,
      penalty_type: 'other',
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      status: 'pending',
      penalty_date: currentDate
    });

    console.log('\n✅ Test penalty created:');
    console.log(`   Staff: ${testStaff.first_name} ${testStaff.last_name}`);
    console.log(`   Amount: ${penaltyAmount} so'm`);
    console.log(`   Reason: ${penalty.reason}`);
    console.log(`   Status: ${penalty.status}`);
    console.log(`   Type: ${penalty.penalty_type}`);
    console.log(`\n💡 Now go to Admin Panel → Maoshlar → Jarimalar to see and approve it!`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestPenalty();
