import fetch from 'node-fetch';

const testApiCall = async () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODk1OWI5YjNlMDQ5ODJkMGQyMWFmY2MiLCJlbWFpbCI6InZlbGFuQHRoZXllbGxvdy5uZXR3b3JrIiwicm9sZSI6InN1cGVydmlzb3IiLCJqdGkiOiJiYzIyOGVlMi1mZjE2LTRiNjMtOGRhNy00MDcyODVmM2ZiMjQiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzU0OTI4NzkzLCJleHAiOjE3NTQ5Mjk2OTN9.Xv5sHHz2YJOaHpAZYYKbYfzPR1XOTf3Er5tiHxHYJbA';
  
  try {
    console.log('Making API call to /api/claims...');
    
    const response = await fetch('http://localhost:5000/api/claims?limit=50', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error making API call:', error);
  }
};

testApiCall();
