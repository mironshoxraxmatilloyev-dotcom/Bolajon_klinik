import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db?retryWrites=true&w=majority';

const services = [
  {
    name: 'Shifokor ko\'rigi',
    category: 'Shifokor ko\'rigi',
    price: 0,
    description: 'Shifokor ko\'rigi xizmati',
    is_active: true
  },
  {
    name: 'Kunduzgi muolaja',
    category: 'Kunduzgi muolaja',
    price: 0,
    description: 'Kunduzgi muolaja xizmati',
    is_active: true
  },
  {
    name: 'Laboratoriya xizmatlari',
    category: 'Laboratoriya xizmatlari',
    price: 0,
    description: 'Laboratoriya xizmatlari',
    is_active: true
  },
  {
    name: 'Fizioterapiya xizmatlari',
    category: 'Fizioterapiya xizmatlari',
    price: 0,
    description: 'Fizioterapiya xizmatlari',
    is_active: true
  },
  {
    name: 'Boshqa tibbiy xizmatlar',
    category: 'Boshqa tibbiy xizmatlar',
    price: 0,
    description: 'Boshqa tibbiy xizmatlar',
    is_active: true
  }
];

async function resetServices() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const servicesCollection = db.collection('services');

    // 1. Barcha xizmatlarni o'chirish
    console.log('🗑️  Deleting all existing services...');
    const deleteResult = await servicesCollection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} services`);

    // 2. Yangi xizmatlarni qo'shish
    console.log('➕ Adding new services...');
    const insertResult = await servicesCollection.insertMany(services);
    console.log(`✅ Added ${insertResult.insertedCount} services`);

    // 3. Qo'shilgan xizmatlarni ko'rsatish
    console.log('\n📋 New services:');
    const allServices = await servicesCollection.find({}).toArray();
    allServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} - ${service.category} - ${service.price} so'm`);
    });

    console.log('\n✅ Services reset completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetServices();
