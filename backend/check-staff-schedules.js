import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function checkStaffSchedules() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staff');
    const StaffSalary = mongoose.model('StaffSalary', new mongoose.Schema({}, { strict: false }), 'staff_salaries');

    // Get all staff
    const allStaff = await Staff.find({});
    console.log(`\n📋 Found ${allStaff.length} staff members\n`);

    for (const staff of allStaff) {
      const salary = await StaffSalary.findOne({ staff_id: staff._id });
      
      console.log(`👤 ${staff.first_name} ${staff.last_name} (${staff.role})`);
      console.log(`   ID: ${staff._id}`);
      
      if (salary) {
        console.log(`   ✅ Ish vaqti: ${salary.work_start_time || 'Belgilanmagan'} - ${salary.work_end_time || 'Belgilanmagan'}`);
        console.log(`   💰 Maosh: ${salary.base_salary || 0} so'm`);
        console.log(`   📅 Haftada: ${salary.work_days_per_week || 0} kun`);
        console.log(`   ⏰ Oylik: ${salary.work_hours_per_month || 0} soat`);
      } else {
        console.log(`   ❌ Maosh belgilanmagan`);
      }
      console.log('');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStaffSchedules();
