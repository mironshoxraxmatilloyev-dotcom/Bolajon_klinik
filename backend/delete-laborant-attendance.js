import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function deleteLaborantAttendance() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const laborantId = new mongoose.Types.ObjectId('6981dae9e338bf243fd14bbf');

    const result = await mongoose.connection.db.collection('attendances').deleteMany({
      staff: laborantId
    });

    console.log(`\n✅ Deleted ${result.deletedCount} attendance records`);
    console.log('💡 Now login as laborant and click "Men keldim"!');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteLaborantAttendance();
