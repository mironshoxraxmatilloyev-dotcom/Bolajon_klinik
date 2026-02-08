import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from '../models/Staff.js';

dotenv.config();

const resetAllPasswords = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // Get all staff
    const staff = await Staff.find({});

    if (staff.length === 0) {
      console.log('⚠️  Hech qanday xodim topilmadi\n');
    } else {
      console.log('🔐 PAROLLARNI YANGILASH:\n');
      console.log('═'.repeat(80));
      
      const credentials = [];
      
      for (const member of staff) {
        // Set simple password based on role
        const newPassword = `${member.role}123`;
        member.password = newPassword;
        await member.save();
        
        credentials.push({
          name: `${member.first_name} ${member.last_name}`,
          username: member.username,
          password: newPassword,
          role: member.role
        });
        
        console.log(`✅ ${member.first_name} ${member.last_name}`);
        console.log(`   Username: ${member.username}`);
        console.log(`   Password: ${newPassword}`);
        console.log(`   Lavozim: ${member.role}\n`);
      }
      
      console.log('═'.repeat(80));
      console.log(`\n✅ ${staff.length} ta xodimning paroli yangilandi!\n`);
      
      // Print summary table
      console.log('📋 QISQACHA JADVAL:\n');
      console.log('| # | Ism | Username | Password | Lavozim |');
      console.log('|---|-----|----------|----------|---------|');
      credentials.forEach((cred, index) => {
        console.log(`| ${index + 1} | ${cred.name} | ${cred.username} | ${cred.password} | ${cred.role} |`);
      });
      console.log('\n');
    }

    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

resetAllPasswords();
