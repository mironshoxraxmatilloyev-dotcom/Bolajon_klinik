import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function deleteAllPenalties() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Penalty = mongoose.model('Penalty', new mongoose.Schema({}, { strict: false }), 'penalties');

    // Get all penalties first
    const penalties = await Penalty.find({});
    console.log(`\n📋 Found ${penalties.length} penalties in database:`);
    penalties.forEach((p, i) => {
      console.log(`${i + 1}. Amount: ${p.amount}, Reason: ${p.reason}, Status: ${p.status}`);
    });

    // Delete all penalties
    const result = await Penalty.deleteMany({});
    console.log(`\n✅ Deleted ${result.deletedCount} penalties from database`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteAllPenalties();
