import axios from 'axios';

async function testPenaltiesAPI() {
  try {
    console.log('🔍 Testing penalties API...\n');

    // First, login as admin to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5001/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received\n');

    // Now get penalties
    console.log('2. Getting penalties...');
    const penaltiesResponse = await axios.get('http://localhost:5001/api/v1/payroll/penalties', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Penalties API response:');
    console.log('   Success:', penaltiesResponse.data.success);
    console.log('   Total penalties:', penaltiesResponse.data.data.length);
    console.log('\n📋 Penalties:');
    
    penaltiesResponse.data.data.forEach((penalty, i) => {
      console.log(`\n${i + 1}. ${penalty.staff_id ? `${penalty.staff_id.first_name} ${penalty.staff_id.last_name}` : 'NO STAFF'}`);
      console.log(`   Amount: ${penalty.amount}`);
      console.log(`   Reason: ${penalty.reason}`);
      console.log(`   Status: ${penalty.status}`);
      console.log(`   Type: ${penalty.penalty_type}`);
      console.log(`   Staff ID: ${penalty.staff_id ? penalty.staff_id._id : 'NULL'}`);
      console.log(`   Staff Role: ${penalty.staff_id ? penalty.staff_id.role : 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testPenaltiesAPI();
