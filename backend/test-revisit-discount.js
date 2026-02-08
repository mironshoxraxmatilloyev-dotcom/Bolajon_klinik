import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Patient from './src/models/Patient.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function testRevisitDiscount() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Test 1: Birinchi faol bemorni topish
    const patient = await Patient.findOne({ status: 'active' }).sort({ createdAt: -1 });
    
    if (!patient) {
      console.log('❌ Faol bemor topilmadi');
      return;
    }

    console.log('\n📋 Bemor ma\'lumotlari:');
    console.log('Ism:', patient.first_name, patient.last_name);
    console.log('Telefon:', patient.phone);
    console.log('Oxirgi qabul:', patient.last_visit_date || 'Hali qabul bo\'lmagan');

    // Test 2: Oxirgi qabul sanasini o'zgartirish (test uchun)
    const testDates = [
      { days: 2, label: '2 kun oldin (100% chegirma)' },
      { days: 5, label: '5 kun oldin (50% chegirma)' },
      { days: 10, label: '10 kun oldin (chegirma yo\'q)' }
    ];

    console.log('\n🧪 Qayta qabul chegirma testlari:\n');

    for (const test of testDates) {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - test.days);
      
      patient.last_visit_date = testDate;
      await patient.save();

      // Chegirma hisoblash
      const today = new Date();
      const daysDiff = Math.floor((today - testDate) / (1000 * 60 * 60 * 24));
      
      let discount = 0;
      let discountReason = '';
      
      if (daysDiff >= 1 && daysDiff <= 3) {
        discount = 100;
        discountReason = '100% chegirma (BEPUL)';
      } else if (daysDiff >= 4 && daysDiff <= 7) {
        discount = 50;
        discountReason = '50% chegirma';
      } else {
        discountReason = 'Chegirma yo\'q';
      }

      console.log(`${test.label}:`);
      console.log(`  Oxirgi qabul: ${testDate.toLocaleDateString('uz-UZ')}`);
      console.log(`  Kunlar farqi: ${daysDiff} kun`);
      console.log(`  Chegirma: ${discountReason}`);
      console.log('');
    }

    // Test 3: Hozirgi sanaga qaytarish
    patient.last_visit_date = null;
    await patient.save();
    console.log('✅ Test tugadi. Bemor ma\'lumotlari asl holatiga qaytarildi.');

  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDB disconnected');
  }
}

testRevisitDiscount();
