import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from '../models/Staff.js';

dotenv.config();

const createChiefDoctor = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Check if chief doctor already exists
    const existingChiefDoctor = await Staff.findOne({ role: 'chief_doctor' });
    
    if (existingChiefDoctor) {
      console.log('⚠️  Bosh shifokor allaqachon mavjud:');
      console.log(`   Username: ${existingChiefDoctor.username}`);
      console.log(`   Ism: ${existingChiefDoctor.first_name} ${existingChiefDoctor.last_name}`);
      
      // Update password if needed
      existingChiefDoctor.password = 'chiefDoctor2024!';
      await existingChiefDoctor.save();
      console.log('✅ Parol yangilandi: chiefDoctor2024!');
    } else {
      // Create new chief doctor
      const chiefDoctor = new Staff({
        username: 'bosshifokor',
        password: 'chiefDoctor2024!',
        email: 'chief@clinic.uz',
        phone: '+998901234567',
        first_name: 'Bosh',
        last_name: 'Shifokor',
        role: 'chief_doctor',
        specialization: 'Bosh shifokor',
        department: 'Boshqaruv',
        salary: 15000000,
        status: 'active',
        hire_date: new Date()
      });

      await chiefDoctor.save();
      console.log('✅ Bosh shifokor yaratildi!');
      console.log('   Username: bosshifokor');
      console.log('   Password: chiefDoctor2024!');
      console.log(`   ID: ${chiefDoctor._id}`);
    }

    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createChiefDoctor();
