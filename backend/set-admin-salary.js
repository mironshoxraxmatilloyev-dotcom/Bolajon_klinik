import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function setAdminSalary() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staff');
    const StaffSalary = mongoose.model('StaffSalary', new mongoose.Schema({}, { strict: false }), 'staff_salaries');

    // Find admin
    const admin = await Staff.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('❌ Admin not found');
      process.exit(1);
    }

    console.log(`\n👤 Admin: ${admin.first_name} ${admin.last_name}`);
    console.log(`   ID: ${admin._id}`);

    // Check if salary exists
    let salary = await StaffSalary.findOne({ staff_id: admin._id });
    
    if (!salary) {
      // Create salary
      salary = await StaffSalary.create({
        staff_id: admin._id,
        base_salary: 5000000, // 5 million
        position_bonus: 0,
        experience_bonus: 0,
        commission_rate: 0,
        room_cleaning_rate: 0,
        calculation_type: 'fixed',
        work_start_time: '09:00',
        work_end_time: '18:00',
        work_days_per_week: 6,
        work_hours_per_month: 234, // 9 hours * 6 days * 4.33 weeks
        notes: 'Admin'
      });
      console.log('\n✅ Salary created');
    } else {
      // Update salary
      salary.work_start_time = '09:00';
      salary.work_end_time = '18:00';
      salary.work_days_per_week = 6;
      salary.work_hours_per_month = 234;
      salary.base_salary = 5000000;
      await salary.save();
      console.log('\n✅ Salary updated');
    }

    console.log('\n💰 Salary info:');
    console.log(`   Base salary: ${salary.base_salary} so'm`);
    console.log(`   Work time: ${salary.work_start_time} - ${salary.work_end_time}`);
    console.log(`   Days/week: ${salary.work_days_per_week}`);
    console.log(`   Hours/month: ${salary.work_hours_per_month}`);
    console.log(`   Hourly rate: ${Math.round(salary.base_salary / salary.work_hours_per_month)} so'm/soat`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('\n💡 Now login as admin and click "Men keldim"!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setAdminSalary();
