/**
 * TEST MY BONUSES ENDPOINT
 * Test the /api/v1/staff-salary/my-bonuses endpoint
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

const Bonus = mongoose.model('Bonus', new mongoose.Schema({}, { strict: false }), 'bonuses');
const Penalty = mongoose.model('Penalty', new mongoose.Schema({}, { strict: false }), 'penalties');

async function testMyBonusesEndpoint() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    const laborantId = '6981dae9e338bf243fd14bbf';

    // Simulate what the endpoint does
    console.log('📋 Simulating /api/v1/staff-salary/my-bonuses endpoint...\n');

    // Get bonuses
    const bonusRecords = await Bonus.find({
      staff_id: new mongoose.Types.ObjectId(laborantId),
      status: 'approved'
    })
      .sort({ created_at: -1 })
      .lean();

    console.log(`✅ Found ${bonusRecords.length} bonuses`);

    // Get penalties (both pending and approved)
    const penaltyRecords = await Penalty.find({
      staff_id: new mongoose.Types.ObjectId(laborantId),
      status: { $in: ['pending', 'approved'] }
    })
      .sort({ created_at: -1 })
      .lean();

    console.log(`✅ Found ${penaltyRecords.length} penalties\n`);

    // Map bonuses
    const bonuses = bonusRecords.map(bonus => ({
      id: bonus._id.toString(),
      bonus_type: bonus.bonus_type || 'other',
      amount: bonus.amount,
      reason: bonus.reason,
      bonus_date: bonus.penalty_date || bonus.created_at,
      status: bonus.status
    }));

    // Map penalties
    const penalties = penaltyRecords.map(penalty => ({
      id: penalty._id.toString(),
      penalty_type: penalty.penalty_type || 'other',
      amount: penalty.amount,
      reason: penalty.reason,
      penalty_date: penalty.penalty_date || penalty.created_at,
      status: penalty.status,
      month: penalty.month,
      year: penalty.year
    }));

    console.log('📦 Response data:');
    console.log(JSON.stringify({
      success: true,
      data: {
        bonuses,
        penalties
      }
    }, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

testMyBonusesEndpoint();
