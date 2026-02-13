/**
 * Barcha "Laboratoriya xizmatlari" kategoriyasidagi xizmatlarni "Laboratoriya" ga o'zgartirish
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function updateLabCategory() {
  try {
    console.log('=== UPDATING LAB CATEGORY ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    
    const Service = mongoose.model('Service', new mongoose.Schema({
      name: String,
      category: String,
      price: Number,
      description: String,
      is_active: Boolean
    }));
    
    // "Laboratoriya xizmatlari" kategoriyasidagi xizmatlarni topish
    const oldCategoryServices = await Service.find({ category: 'Laboratoriya xizmatlari' });
    console.log(`Found ${oldCategoryServices.length} services with "Laboratoriya xizmatlari" category`);
    
    if (oldCategoryServices.length > 0) {
      console.log('\nServices to update:');
      oldCategoryServices.forEach(service => {
        console.log(`  - ${service.name} (${service.price} so'm)`);
      });
      
      // Kategoriyani yangilash
      const result = await Service.updateMany(
        { category: 'Laboratoriya xizmatlari' },
        { $set: { category: 'Laboratoriya' } }
      );
      
      console.log(`\n✓ Updated ${result.modifiedCount} services`);
    } else {
      console.log('\nNo services found with "Laboratoriya xizmatlari" category');
    }
    
    // Natijani tekshirish
    const labServices = await Service.find({ category: 'Laboratoriya' });
    console.log(`\n✓ Total services in "Laboratoriya" category: ${labServices.length}`);
    
    console.log('\nAll lab services:');
    labServices.forEach(service => {
      console.log(`  - ${service.name} (${service.price} so'm)`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

updateLabCategory();
