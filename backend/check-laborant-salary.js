import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function checkLaborantSalary() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staffs');
    const StaffSalary = mongoose.model('StaffSalary', new mongoose.Schema({}, { strict: false }), 'staff_salaries');

    // Find laborant
    const laborant = await Staff.findOne({ username: 'laborant' });
    
    if (!laborant) {
      console.log('❌ Laborant not found');
      process.exit(1);
    }

    console.log(`\n👤 Laborant: ${laborant.first_name} ${laborant.last_name}`);
    console.log(`   ID: ${laborant._id}`);
    console.log(`   Username: ${laborant.username}`);

    const salary = await StaffSalary.findOne({ staff_id: laborant._id });
    
    if (!salary) {
      console.log('\n❌ Salary not found for laborant!');
      console.log('💡 This is why penalty is not created - no salary info!');
    } else {
      console.log('\n💰 Salary info:');
      console.log(`   Base salary: ${salary.base_salary || 0}`);
      console.log(`   Work start: ${salary.work_start_time || 'NOT SET'}`);
      console.log(`   Work end: ${salary.work_end_time || 'NOT SET'}`);
      console.log(`   Days/week: ${salary.work_days_per_week || 0}`);
      console.log(`   Hours/month: ${salary.work_hours_per_month || 0}`);
      
      if (salary.work_hours_per_month > 0 && salary.base_salary > 0) {
        const hourlyRate = salary.base_salary / salary.work_hours_per_month;
        console.log(`   Hourly rate: ${Math.round(hourlyRate)} so'm/soat`);
      } else {
        console.log('\n❌ Cannot calculate hourly rate!');
        console.log('💡 This is why penalty amount is 0!');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkLaborantSalary();
