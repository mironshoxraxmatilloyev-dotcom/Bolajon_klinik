import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function checkPenalties() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Penalty = mongoose.model('Penalty', new mongoose.Schema({}, { strict: false }), 'penalties');
    const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staff');

    const penalties = await Penalty.find({});
    
    console.log(`\n📋 Found ${penalties.length} penalties:\n`);
    
    for (const penalty of penalties) {
      const staff = await Staff.findById(penalty.staff_id);
      
      console.log(`${penalty.status === 'pending' ? '⏳' : '✅'} ${staff?.first_name} ${staff?.last_name}`);
      console.log(`   Amount: ${penalty.amount} so'm`);
      console.log(`   Reason: ${penalty.reason}`);
      console.log(`   Status: ${penalty.status}`);
      console.log(`   Type: ${penalty.penalty_type}`);
      console.log(`   Date: ${penalty.penalty_date}`);
      console.log(`   ID: ${penalty._id}`);
      console.log('');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPenalties();
