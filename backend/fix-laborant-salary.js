import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function fixLaborantSalary() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const laborantId = new mongoose.Types.ObjectId('6981dae9e338bf243fd14bbf');

    const result = await mongoose.connection.db.collection('staff_salaries').updateOne(
      { staff_id: laborantId },
      { $set: { base_salary: 3000000 } }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} salary record`);
    console.log('💡 Laborant base salary set to 3,000,000 so\'m');
    console.log('\n💡 Now login as laborant and click "Men keldim"!');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixLaborantSalary();
