import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.log('Usage: node check-current-user-role.js <YOUR_JWT_TOKEN>');
  console.log('\nTo get your token:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Application/Storage > Local Storage');
  console.log('3. Find "token" key and copy its value');
  console.log('4. Run: node check-current-user-role.js "YOUR_TOKEN_HERE"');
  process.exit(1);
}

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('\n=== DECODED TOKEN ===');
  console.log(JSON.stringify(decoded, null, 2));
  
  // Connect to database to get full user info
  const mongoose = await import('mongoose');
  await mongoose.default.connect(process.env.MONGODB_URI);
  
  const Staff = (await import('./src/models/Staff.js')).default;
  const staff = await Staff.findById(decoded.userId).select('-password -two_factor_secret -refresh_token');
  
  if (staff) {
    console.log('\n=== USER INFO FROM DATABASE ===');
    console.log('Username:', staff.username);
    console.log('Full Name:', staff.full_name);
    console.log('Role:', staff.role);
    console.log('Department:', staff.department);
    console.log('Status:', staff.status);
  } else {
    console.log('\n=== USER NOT FOUND IN DATABASE ===');
  }
  
  await mongoose.default.disconnect();
  process.exit(0);
} catch (error) {
  console.error('\n=== ERROR ===');
  console.error(error.message);
  process.exit(1);
}
