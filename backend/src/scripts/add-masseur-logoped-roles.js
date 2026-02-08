import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Role from '../models/Role.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function addRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if roles already exist
    const existingMasseur = await Role.findOne({ name: 'masseur' });
    const existingSpeechTherapist = await Role.findOne({ name: 'speech_therapist' });

    if (existingMasseur) {
      console.log('⚠️  Masseur role already exists');
    } else {
      const masseurRole = new Role({
        name: 'masseur',
        display_name: 'Massajchi',
        description: 'Massaj xizmatlari ko\'rsatuvchi xodim',
        permissions: ['view_patients', 'view_tasks', 'view_salary'],
        is_active: true
      });
      await masseurRole.save();
      console.log('✅ Masseur role created');
    }

    if (existingSpeechTherapist) {
      console.log('⚠️  Speech Therapist role already exists');
    } else {
      const speechTherapistRole = new Role({
        name: 'speech_therapist',
        display_name: 'Logoped',
        description: 'Nutq terapiyasi mutaxassisi',
        permissions: ['view_patients', 'view_tasks', 'view_salary'],
        is_active: true
      });
      await speechTherapistRole.save();
      console.log('✅ Speech Therapist role created');
    }

    console.log('\n📋 All roles:');
    const allRoles = await Role.find({ is_active: true }).sort({ name: 1 });
    allRoles.forEach(role => {
      console.log(`  - ${role.display_name} (${role.name})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

addRoles();
