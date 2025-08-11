import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'config.production.env') });

const testToken = () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODk1OWI5YjNlMDQ5ODJkMGQyMWFmY2MiLCJlbWFpbCI6InZlbGFuQHRoZXllbGxvdy5uZXR3b3JrIiwicm9sZSI6InN1cGVydmlzb3IiLCJqdGkiOiJiYzIyOGVlMi1mZjE2LTRiNjMtOGRhNy00MDcyODVmM2ZiMjQiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzU0OTI4NzkzLCJleHAiOjE3NTQ5Mjk2OTN9.Xv5sHHz2YJOaHpAZYYKbYfzPR1XOTf3Er5tiHxHYJbA';

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:');
    console.log('User ID:', decoded.userId);
    console.log('Email:', decoded.email);
    console.log('Role:', decoded.role);
    console.log('Issued at:', new Date(decoded.iat * 1000));
    console.log('Expires at:', new Date(decoded.exp * 1000));
    console.log('Is expired:', Date.now() > decoded.exp * 1000);
  } catch (error) {
    console.error('Token verification failed:', error.message);
  }
};

testToken();
