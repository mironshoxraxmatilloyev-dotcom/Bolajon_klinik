import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const LabTest = mongoose.model('LabTest', new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  normal_range: { type: String },
  unit: { type: String },
  description: { type: String },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}));

const newTests = [
  {
    name: 'Биохимия',
    code: 'LAB-BIOCHEM',
    category: 'Биохимия',
    price: 70000,
    description: 'Биохимик қон таҳлили (Kreatinin, Urea)',
    is_active: true
  },
  {
    name: 'Умумий қон таҳлили',
    code: 'LAB-CBC',
    category: 'Гематология',
    price: 50000,
    description: 'Умумий қон таҳлили (Complete Blood Count)',
    is_active: true
  },
  {
    name: 'ТОРЧ',
    code: 'LAB-TORCH',
    category: 'Инфекция',
    price: 120000,
    description: 'TORCH инфекциялари (Toxoplasma, Rubella, CMV, Herpes)',
    is_active: true
  },
  {
    name: 'Сийдик таҳлили',
    code: 'LAB-URINE',
    category: 'Умумий',
    price: 40000,
    description: 'Умумий сийдик таҳлили',
    is_active: true
  },
  {
    name: 'Витамин Д',
    code: 'LAB-VITD',
    category: 'Витаминлар',
    price: 90000,
    description: 'Витамин D (25-OH)',
    is_active: true
  },
  {
    name: 'Гормон таҳлили',
    code: 'LAB-HORMONE',
    category: 'Эндокринология',
    price: 120000,
    description: 'Гормон таҳлили (TSH, T3, T4)',
    is_active: true
  },
  {
    name: 'Коагулограмма',
    code: 'LAB-COAG',
    category: 'Гематология',
    price: 60000,
    description: 'Қон ивиш тизими таҳлили',
    is_active: true
  },
  {
    name: 'Липид спектри',
    code: 'LAB-LIPID',
    category: 'Биохимия',
    price: 90000,
    description: 'Липид профили (Холестерин, HDL, LDL, Триглицериды)',
    is_active: true
  },
  {
    name: 'Онкомаркер',
    code: 'LAB-ONCO',
    category: 'Онкология',
    price: 150000,
    description: 'Онкомаркерлар таҳлили',
    is_active: true
  },
  {
    name: 'Прокальцитонин',
    code: 'LAB-PCT',
    category: 'Инфекция',
    price: 100000,
    description: 'Прокальцитонин (PCT) - сепсис маркери',
    is_active: true
  },
  {
    name: 'Тропонин',
    code: 'LAB-TROP',
    category: 'Кардиология',
    price: 80000,
    description: 'Тропонин - юрак маркери',
    is_active: true
  }
];

async function updateLabTests() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Barcha eski tahlillarni o'chirish
    console.log('\n🗑️  Deleting all existing lab tests...');
    const deleteResult = await LabTest.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing tests`);

    // 2. Yangi tahlillarni qo'shish
    console.log('\n➕ Adding new lab tests...');
    for (const test of newTests) {
      const created = await LabTest.create(test);
      console.log(`✅ Added: ${created.name} (${created.code}) - ${created.price.toLocaleString()} so'm`);
    }

    console.log('\n✅ Successfully updated all lab tests!');
    console.log(`📊 Total tests: ${newTests.length}`);

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateLabTests();
