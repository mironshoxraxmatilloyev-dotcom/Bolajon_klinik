/**
 * ADD RECEPTION SALARY
 * Qabulxonachi uchun maosh ma'lumotlarini qo'shish
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staffs');
const StaffSalary = mongoose.model('StaffSalary', new mongoose.Schema({}, { strict: false }), 'staff_salaries');

async function addReceptionSalary() {
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

    // Check if salary already exists
    const existing = await StaffSalary.findOne({ staff_id: staff._id });
    
    if (existing) {
      console.log('\n⚠️  Maosh ma\'lumotlari allaqachon mavjud!');
      console.log('   Base salary:', existing.base_salary);
      console.log('   Work start:', existing.work_start_time);
      console.log('   Work end:', existing.work_end_time);
      
      // Update if needed
      console.log('\n📝 Updating salary...');
      existing.base_salary = 2500000;
      existing.work_start_time = '09:00';
      existing.work_end_time = '18:00';
      existing.work_days_per_week = 6;
      existing.work_hours_per_month = 208;
      existing.calculation_type = 'fixed';
      existing.notes = 'Qabulxonachi - kunlik ish vaqti 09:00-18:00';
      await existing.save();
      
      console.log('✅ Salary updated!');
    } else {
      // Create new salary record
      console.log('\n📝 Creating salary record...');
      
      const salary = await StaffSalary.create({
        staff_id: staff._id,
        base_salary: 2500000,
        position_bonus: 0,
        experience_bonus: 0,
        commission_rate: 0,
        room_cleaning_rate: 0,
        calculation_type: 'fixed',
        work_start_time: '09:00',
        work_end_time: '18:00',
        work_days_per_week: 6,
        work_hours_per_month: 208, // 8 hours * 6 days * 4.33 weeks
        effective_from: new Date(),
        notes: 'Qabulxonachi - kunlik ish vaqti 09:00-18:00',
        created_at: new Date(),
        updated_at: new Date()
      });

      console.log('✅ Salary record created:', salary._id);
    }

    console.log('\n💰 Final salary info:');
    const finalSalary = await StaffSalary.findOne({ staff_id: staff._id });
    console.log('   Base salary:', finalSalary.base_salary, 'so\'m');
    console.log('   Work hours: 09:00 - 18:00');
    console.log('   Work days: 6 days/week');
    console.log('   Monthly hours:', finalSalary.work_hours_per_month);
    console.log('   Hourly rate:', Math.round(finalSalary.base_salary / finalSalary.work_hours_per_month), 'so\'m/hour');

    console.log('\n✅ Tayyor!');
    console.log('\n📱 Login ma\'lumotlari:');
    console.log('   Username: qabulxona');
    console.log('   Password: qabulxona2024');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

addReceptionSalary();
