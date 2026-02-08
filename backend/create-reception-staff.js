/**
 * CREATE RECEPTION STAFF
 * Qabulxonachi yaratish va ish soatini belgilash
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staffs');
const StaffSalary = mongoose.model('StaffSalary', new mongoose.Schema({}, { strict: false }), 'staff_salaries');

async function createReceptionStaff() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Check if reception staff already exists
    const existing = await Staff.findOne({ username: 'qabulxona' });
    
    if (existing) {
      console.log('⚠️  Qabulxonachi allaqachon mavjud!');
      console.log('👤 Username:', existing.username);
      console.log('📧 Email:', existing.email);
      console.log('🆔 ID:', existing._id);
      
      // Check salary
      const salary = await StaffSalary.findOne({ staff_id: existing._id });
      if (salary) {
        console.log('\n💰 Maosh ma\'lumotlari:');
        console.log('   Base salary:', salary.base_salary);
        console.log('   Work start:', salary.work_start_time);
        console.log('   Work end:', salary.work_end_time);
        console.log('   Days/week:', salary.work_days_per_week);
        console.log('   Hours/month:', salary.work_hours_per_month);
      } else {
        console.log('\n⚠️  Maosh ma\'lumotlari topilmadi!');
      }
      
      await mongoose.disconnect();
      return;
    }

    console.log('📝 Creating reception staff...');

    // Hash password
    const hashedPassword = await bcrypt.hash('qabulxona2024', 10);

    // Create staff
    const staff = await Staff.create({
      first_name: 'Qabulxona',
      last_name: 'Xodimi',
      username: 'qabulxona',
      password: hashedPassword,
      email: 'qabulxona@clinic.uz',
      phone: '+998901234567',
      role: 'reception',
      employee_id: 'REC001',
      hire_date: new Date(),
      is_active: true,
      base_salary: 2500000, // 2.5 million so'm
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log('✅ Staff created:', staff._id);
    console.log('   Username:', staff.username);
    console.log('   Password: qabulxona2024');
    console.log('   Role:', staff.role);
    console.log('   Employee ID:', staff.employee_id);

    // Create salary record with work schedule
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

    console.log('\n💰 Salary record created:', salary._id);
    console.log('   Base salary:', salary.base_salary, 'so\'m');
    console.log('   Work hours: 09:00 - 18:00');
    console.log('   Work days: 6 days/week');
    console.log('   Monthly hours:', salary.work_hours_per_month);
    console.log('   Hourly rate:', Math.round(salary.base_salary / salary.work_hours_per_month), 'so\'m/hour');

    console.log('\n✅ Qabulxonachi muvaffaqiyatli yaratildi!');
    console.log('\n📱 Login ma\'lumotlari:');
    console.log('   Username: qabulxona');
    console.log('   Password: qabulxona2024');
    console.log('\n🎯 Imkoniyatlar:');
    console.log('   ✓ Qabulxona paneli');
    console.log('   ✓ Mening Vazifalarim (Men keldim/Men ketdim)');
    console.log('   ✓ Mening Maoshim');
    console.log('   ✓ Kechikish/Erta ketish avtomatik jarima');
    console.log('   ✓ Men ketdim bosganda kasir hisoboti yaratiladi');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

createReceptionStaff();
