/**
 * CHECK MY PENALTIES
 * Check penalties for a specific staff member
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

const Penalty = mongoose.model('Penalty', new mongoose.Schema({}, { strict: false }), 'penalties');
const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staffs');

async function checkMyPenalties() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    const laborantId = '6981dae9e338bf243fd14bbf';

    // Get staff info
    const staff = await Staff.findById(laborantId);
    console.log('👤 Staff:', staff.first_name, staff.last_name);
    console.log('💰 Base Salary:', staff.base_salary, 'so\'m\n');

    // Get all penalties
    const penalties = await Penalty.find({
      staff_id: new mongoose.Types.ObjectId(laborantId)
    }).sort({ created_at: -1 });

    console.log(`📋 Total Penalties: ${penalties.length}\n`);

    // Group by status
    const pending = penalties.filter(p => p.status === 'pending');
    const approved = penalties.filter(p => p.status === 'approved');
    const rejected = penalties.filter(p => p.status === 'rejected');

    console.log('⏳ PENDING PENALTIES:', pending.length);
    pending.forEach(p => {
      console.log(`  - ${p.penalty_type}: ${p.amount} so'm`);
      console.log(`    Reason: ${p.reason}`);
      console.log(`    Date: ${p.penalty_date}`);
      console.log(`    Month/Year: ${p.month}/${p.year}\n`);
    });

    console.log('✅ APPROVED PENALTIES:', approved.length);
    approved.forEach(p => {
      console.log(`  - ${p.penalty_type}: ${p.amount} so'm`);
      console.log(`    Reason: ${p.reason}`);
      console.log(`    Date: ${p.penalty_date}`);
      console.log(`    Month/Year: ${p.month}/${p.year}\n`);
    });

    console.log('❌ REJECTED PENALTIES:', rejected.length);
    rejected.forEach(p => {
      console.log(`  - ${p.penalty_type}: ${p.amount} so'm`);
      console.log(`    Reason: ${p.reason}`);
      console.log(`    Date: ${p.penalty_date}`);
      console.log(`    Month/Year: ${p.month}/${p.year}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkMyPenalties();
