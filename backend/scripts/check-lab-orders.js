/**
 * Laboratoriya buyurtmalarini tekshirish
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkLabOrders() {
  try {
    console.log('=== CHECKING LAB ORDERS ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    
    const LabOrder = mongoose.model('LabOrder', new mongoose.Schema({}, { strict: false }));
    const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false }));
    
    // Oxirgi 10 ta hisob-fakturani olish
    const recentInvoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('patient_id', 'first_name last_name patient_number');
    
    console.log('=== RECENT INVOICES ===');
    for (const invoice of recentInvoices) {
      console.log(`\nInvoice: ${invoice.invoice_number}`);
      console.log(`Patient: ${invoice.patient_id?.first_name} ${invoice.patient_id?.last_name}`);
      console.log(`Date: ${invoice.createdAt}`);
      console.log(`Items:`, invoice.items?.map(i => i.description).join(', '));
      
      // Bu invoice uchun lab order bormi?
      const labOrders = await LabOrder.find({ invoice_id: invoice._id })
        .populate('laborant_id', 'first_name last_name');
      
      if (labOrders.length > 0) {
        console.log(`✓ Lab orders: ${labOrders.length}`);
        labOrders.forEach(order => {
          console.log(`  - ${order.test_name} (${order.status})`);
          console.log(`    Laborant: ${order.laborant_id?.first_name} ${order.laborant_id?.last_name}`);
        });
      } else {
        console.log(`✗ No lab orders found`);
      }
    }
    
    // Barcha lab orderlar
    console.log('\n\n=== ALL LAB ORDERS ===');
    const allLabOrders = await LabOrder.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('patient_id', 'first_name last_name patient_number')
      .populate('laborant_id', 'first_name last_name');
    
    console.log(`Total lab orders: ${allLabOrders.length}\n`);
    
    allLabOrders.forEach(order => {
      console.log(`Order: ${order.order_number}`);
      console.log(`Patient: ${order.patient_id?.first_name} ${order.patient_id?.last_name}`);
      console.log(`Test: ${order.test_name}`);
      console.log(`Laborant: ${order.laborant_id?.first_name} ${order.laborant_id?.last_name || 'Not assigned'}`);
      console.log(`Status: ${order.status}`);
      console.log(`Date: ${order.createdAt}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

checkLabOrders();
