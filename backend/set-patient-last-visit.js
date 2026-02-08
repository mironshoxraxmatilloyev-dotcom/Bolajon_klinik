import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Patient from './src/models/Patient.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

async function setPatientLastVisit() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Birinchi bemorni topish
    const patient = await Patient.findOne({ status: 'active' }).sort({ createdAt: -1 });
    
    if (!patient) {
      console.log('❌ Bemor topilmadi');
      return;
    }

    console.log('\n📋 Bemor ma\'lumotlari:');
    console.log('ID:', patient._id);
    console.log('Ism:', patient.first_name, patient.last_name);
    console.log('Telefon:', patient.phone);
    console.log('Bemor raqami:', patient.patient_number);

    // Oxirgi qabul sanasini 2 kun oldin qilish (100% chegirma uchun)
    const lastVisit = new Date();
    lastVisit.setDate(lastVisit.getDate() - 2);
    
    patient.last_visit_date = lastVisit;
    await patient.save();

    console.log('\n✅ Oxirgi qabul sanasi o\'rnatildi:', lastVisit.toLocaleDateString('uz-UZ'));
    console.log('📌 Endi bu bemorni kassada tanlasangiz, 100% chegirma ko\'rsatiladi!');
    console.log('\n💡 Test qilish uchun:');
    console.log('1. Frontend\'da kassaga kiring');
    console.log('2. Bu bemorni tanlang:', patient.first_name, patient.last_name);
    console.log('3. Qayta qabul chegirmasi ko\'rsatilishini tekshiring');

  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDB disconnected');
  }
}

setPatientLastVisit();
