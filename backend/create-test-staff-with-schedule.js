import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function createTestStaff() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staff');
    const StaffSalary = mongoose.model('StaffSalary', new mongoose.Schema({}, { strict: false }), 'staff_salaries');

    // Check if test staff already exists
    let testStaff = await Staff.findOne({ username: 'test_nurse' });
    
    if (!testStaff) {
      // Create test staff
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      testStaff = await Staff.create({
        first_name: 'Test',
        last_name: 'Hamshira',
        username: 'test_nurse',
        password: hashedPassword,
        role: 'nurse',
        phone: '+998901234567',
        email: 'test@clinic.uz',
        employee_id: 'EMP001',
        is_active: true
      });
      
      console.log('✅ Test staff created:', testStaff.first_name, testStaff.last_name);
    } else {
      console.log('✅ Test staff already exists:', testStaff.first_name, testStaff.last_name);
    }

    // Check if salary exists
    let salary = await StaffSalary.findOne({ staff_id: testStaff._id });
    
    if (!salary) {
      // Create salary with work schedule
      salary = await StaffSalary.create({
        staff_id: testStaff._id,
        base_salary: 3000000, // 3 million
        position_bonus: 0,
        experience_bonus: 0,
        commission_rate: 5,
        room_cleaning_rate: 0,
        calculation_type: 'commission',
        work_start_time: '09:00',
        work_end_time: '18:00',
        work_days_per_week: 6,
        work_hours_per_month: 234, // 9 hours * 6 days * 4.33 weeks
        notes: 'Test xodim'
      });
      
      console.log('✅ Salary created with work schedule');
    } else {
      // Update existing salary with work schedule
      salary.work_start_time = '09:00';
      salary.work_end_time = '18:00';
      salary.work_days_per_week = 6;
      salary.work_hours_per_month = 234;
      salary.base_salary = 3000000;
      await salary.save();
      
      console.log('✅ Salary updated with work schedule');
    }

    console.log('\n📋 Test Staff Details:');
    console.log(`   Username: test_nurse`);
    console.log(`   Password: 123456`);
    console.log(`   Name: ${testStaff.first_name} ${testStaff.last_name}`);
    console.log(`   Role: ${testStaff.role}`);
    console.log(`   ID: ${testStaff._id}`);
    console.log(`\n⏰ Work Schedule:`);
    console.log(`   Start: ${salary.work_start_time}`);
    console.log(`   End: ${salary.work_end_time}`);
    console.log(`   Days/week: ${salary.work_days_per_week}`);
    console.log(`   Hours/month: ${salary.work_hours_per_month}`);
    console.log(`   Base Salary: ${salary.base_salary} so'm`);
    console.log(`   Hourly Rate: ${Math.round(salary.base_salary / salary.work_hours_per_month)} so'm/soat`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestStaff();
