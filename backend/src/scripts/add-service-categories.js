import mongoose from 'mongoose';
import ServiceCategory from '../models/ServiceCategory.js';

const categories = [
  {
    name: 'Shifokor ko\'rigi',
    description: 'Shifokor konsultatsiyasi va ko\'rik xizmatlari'
  },
  {
    name: 'Kunduzgi muolaja',
    description: 'Kunduzgi statsionar muolaja xizmatlari'
  },
  {
    name: 'Laboratoriya xizmatlari',
    description: 'Tahlillar va laboratoriya tekshiruvlari'
  },
  {
    name: 'Fizioterapiya xizmatlari',
    description: 'Fizioterapiya va reabilitatsiya xizmatlari'
  },
  {
    name: 'Boshqa tibbiy xizmatlar',
    description: 'Qo\'shimcha tibbiy xizmatlar'
  }
];

async function addServiceCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://mironshox:D1WVdeVfthVP1Z2F@cluster0.zthjn1c.mongodb.net/clinic_db';
    
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing categories (optional)
    console.log('\n🗑️  Clearing existing categories...');
    await ServiceCategory.deleteMany({});
    console.log('✅ Existing categories cleared');
    
    // Add new categories
    console.log('\n📝 Adding service categories...');
    for (const category of categories) {
      const newCategory = await ServiceCategory.create(category);
      console.log(`✅ Added: ${newCategory.name}`);
    }
    
    console.log('\n🎉 All service categories added successfully!');
    
    // Display all categories
    const allCategories = await ServiceCategory.find().sort({ name: 1 });
    console.log('\n📋 Current categories:');
    allCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} - ${cat.description}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addServiceCategories();
