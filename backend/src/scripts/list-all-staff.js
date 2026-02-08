import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from '../models/Staff.js';

dotenv.config();

const listAllStaff = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // Get all staff
    const staff = await Staff.find({}).select('username first_name last_name role email phone status').lean();

    if (staff.length === 0) {
      console.log('⚠️  Hech qanday xodim topilmadi\n');
    } else {
      console.log('📋 BARCHA XODIMLAR:\n');
      console.log('═'.repeat(80));
      
      staff.forEach((member, index) => {
        console.log(`\n${index + 1}. ${member.first_name} ${member.last_name}`);
        console.log(`   Username: ${member.username}`);
        console.log(`   Lavozim: ${member.role}`);
        console.log(`   Email: ${member.email || 'N/A'}`);
        console.log(`   Telefon: ${member.phone || 'N/A'}`);
        console.log(`   Status: ${member.status}`);
        console.log(`   ⚠️  Parol: Database'da shifrlangan (ko'rish mumkin emas)`);
      });
      
      console.log('\n' + '═'.repeat(80));
      console.log(`\nJami: ${staff.length} ta xodim\n`);
      
      console.log('💡 ESLATMA:');
      console.log('   Parollar database\'da bcrypt bilan shifrlangan.');
      console.log('   Agar parolni bilmasangiz, yangi parol o\'rnatish kerak.\n');
    }

    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

listAllStaff();
