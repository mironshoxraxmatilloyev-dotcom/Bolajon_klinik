/**
 * Add Performance Indexes
 * Run: node backend/scripts/add-performance-indexes.js
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

// Import models
const Task = require('../src/models/Task');
const TreatmentSchedule = require('../src/models/TreatmentSchedule');
const Invoice = require('../src/models/Invoice');
const LabOrder = require('../src/models/LabOrder');
const Patient = require('../src/models/Patient');

async function addIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Adding performance indexes...\n');

    // 1. Task indexes
    console.log('1️⃣ Adding Task indexes...');
    await Task.collection.createIndex({ scheduled_time: 1, status: 1 });
    await Task.collection.createIndex({ patient_id: 1, status: 1 });
    await Task.collection.createIndex({ nurse_id: 1, status: 1 });
    console.log('   ✅ Task indexes added\n');

    // 2. TreatmentSchedule indexes
    console.log('2️⃣ Adding TreatmentSchedule indexes...');
    await TreatmentSchedule.collection.createIndex({ scheduled_time: 1, status: 1 });
    await TreatmentSchedule.collection.createIndex({ patient_id: 1, status: 1 });
    await TreatmentSchedule.collection.createIndex({ nurse_id: 1, status: 1 });
    console.log('   ✅ TreatmentSchedule indexes added\n');

    // 3. Invoice indexes
    console.log('3️⃣ Adding Invoice indexes...');
    await Invoice.collection.createIndex({ created_at: -1 });
    await Invoice.collection.createIndex({ patient_id: 1, created_at: -1 });
    await Invoice.collection.createIndex({ payment_status: 1, created_at: -1 });
    await Invoice.collection.createIndex({ invoice_number: 1 }, { unique: true });
    console.log('   ✅ Invoice indexes added\n');

    // 4. LabOrder indexes
    console.log('4️⃣ Adding LabOrder indexes...');
    await LabOrder.collection.createIndex({ created_at: -1 });
    await LabOrder.collection.createIndex({ status: 1, created_at: -1 });
    await LabOrder.collection.createIndex({ patient_id: 1, created_at: -1 });
    await LabOrder.collection.createIndex({ laborant_id: 1, status: 1 });
    await LabOrder.collection.createIndex({ order_number: 1 }, { unique: true });
    console.log('   ✅ LabOrder indexes added\n');

    // 5. Patient indexes
    console.log('5️⃣ Adding Patient indexes...');
    await Patient.collection.createIndex({ first_name: 1, last_name: 1 });
    await Patient.collection.createIndex({ patient_number: 1 }, { unique: true });
    await Patient.collection.createIndex({ phone: 1 });
    await Patient.collection.createIndex({ 
      first_name: 'text', 
      last_name: 'text', 
      patient_number: 'text' 
    }, { 
      name: 'patient_search_index' 
    });
    console.log('   ✅ Patient indexes added\n');

    // List all indexes
    console.log('📋 Listing all indexes:\n');
    
    const taskIndexes = await Task.collection.indexes();
    console.log('Task indexes:', taskIndexes.map(i => i.name).join(', '));
    
    const scheduleIndexes = await TreatmentSchedule.collection.indexes();
    console.log('TreatmentSchedule indexes:', scheduleIndexes.map(i => i.name).join(', '));
    
    const invoiceIndexes = await Invoice.collection.indexes();
    console.log('Invoice indexes:', invoiceIndexes.map(i => i.name).join(', '));
    
    const labOrderIndexes = await LabOrder.collection.indexes();
    console.log('LabOrder indexes:', labOrderIndexes.map(i => i.name).join(', '));
    
    const patientIndexes = await Patient.collection.indexes();
    console.log('Patient indexes:', patientIndexes.map(i => i.name).join(', '));

    console.log('\n✅ All indexes added successfully!');
    console.log('🚀 Performance should be significantly improved');

  } catch (error) {
    console.error('❌ Error adding indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

addIndexes();
