import fetch from 'node-fetch';

const testAPI = async () => {
  try {
    // First, get a token by logging in as Velan
    console.log('Logging in as Velan...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'velan@theyellow.network',
        password: 'password123' // Assuming this is the password
      })
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.access;

    console.log('Login successful, testing claims API...');

    // Test the claims API
    const claimsResponse = await fetch('http://localhost:5000/api/claims', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!claimsResponse.ok) {
      console.error('Claims API failed:', await claimsResponse.text());
      return;
    }

    const claimsData = await claimsResponse.json();
    
    console.log('\n=== API Response ===');
    console.log('Total claims:', claimsData.total);
    console.log('Claims returned:', claimsData.claims.length);
    console.log('Page:', claimsData.page);
    console.log('Limit:', claimsData.limit);
    
    console.log('\n=== Claims Details ===');
    claimsData.claims.forEach((claim, index) => {
      console.log(`\n${index + 1}. Claim ID: ${claim._id}`);
      console.log(`   Employee: ${claim.employeeId?.name} (${claim.employeeId?.email})`);
      console.log(`   Employee Role: ${claim.employeeId?.role}`);
      console.log(`   Status: ${claim.status}`);
      console.log(`   Category: ${claim.category}`);
      console.log(`   Amount: ₹${claim.grandTotal}`);
      console.log(`   Created: ${claim.createdAt}`);
    });

    // Also test stats API
    console.log('\n=== Testing Stats API ===');
    const statsResponse = await fetch('http://localhost:5000/api/claims/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('Stats response:', JSON.stringify(statsData, null, 2));
    } else {
      console.error('Stats API failed:', await statsResponse.text());
    }

  } catch (error) {
    console.error('Error:', error);
  }
};

testAPI();
