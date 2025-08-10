import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, 'uploads');

console.log('Testing upload directory...');
console.log('Upload directory path:', uploadDir);

try {
  // Check if directory exists
  if (!fs.existsSync(uploadDir)) {
    console.log('Upload directory does not exist, creating...');
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Upload directory created successfully');
  } else {
    console.log('Upload directory exists');
  }

  // Test file writing
  const testFile = path.join(uploadDir, 'test.txt');
  const testContent = 'This is a test file to verify write permissions';
  
  fs.writeFileSync(testFile, testContent);
  console.log('Test file written successfully:', testFile);
  
  // Verify file was written
  const readContent = fs.readFileSync(testFile, 'utf8');
  console.log('Test file content:', readContent);
  
  // Clean up test file
  fs.unlinkSync(testFile);
  console.log('Test file cleaned up');
  
  console.log('✅ Upload directory test passed!');
} catch (error) {
  console.error('❌ Upload directory test failed:', error);
  process.exit(1);
}
