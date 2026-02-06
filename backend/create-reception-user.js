import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from './src/models/Staff.js';

dotenv.config();

const createReceptionUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Check if reception user already exists
    const existingUser = await Staff.findOne({ username: 'qabulxona' });
    
    if (existingUser) {
      console.log('Reception user already exists!');
      console.log('Username:', existingUser.username);
      console.log('Role:', existingUser.role);
      
      // Update password if needed
      existingUser.password = 'qabulxona2026';
      await existingUser.save();
      console.log('Password updated to: qabulxona2026');
    } else {
      // Create new reception user
      const receptionUser = new Staff({
        username: 'qabulxona',
        password: 'qabulxona2026',
        email: 'qabulxona@bolajon.uz',
        first_name: 'Qabulxona',
        last_name: 'Xodimi',
        phone: '+998901234567',
        role: 'receptionist',
        department: 'Qabulxona',
        status: 'active',
        hire_date: new Date()
      });

      await receptionUser.save();
      console.log('✅ Reception user created successfully!');
      console.log('Username: qabulxona');
      console.log('Password: qabulxona2026');
      console.log('Role: receptionist');
    }

    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createReceptionUser();
