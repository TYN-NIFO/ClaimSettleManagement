import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n🔍 DEPLOYMENT READINESS CHECK\n');
console.log('='.repeat(60));

let errors = [];
let warnings = [];
let passed = 0;
let total = 0;

// Helper functions
const check = (name, condition, errorMsg, warningMsg = null) => {
  total++;
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
    return true;
  } else {
    if (warningMsg) {
      console.log(`⚠️  ${name}: ${warningMsg}`);
      warnings.push(`${name}: ${warningMsg}`);
    } else {
      console.log(`❌ ${name}: ${errorMsg}`);
      errors.push(`${name}: ${errorMsg}`);
    }
    return false;
  }
};

const checkEnv = (name, envVar, required = true) => {
  total++;
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${name}: ${envVar.includes('SECRET') || envVar.includes('KEY') || envVar.includes('PASS') ? '***' : value}`);
    passed++;
    return true;
  } else {
    if (required) {
      console.log(`❌ ${name}: ${envVar} is not set`);
      errors.push(`${name}: ${envVar} is required`);
    } else {
      console.log(`⚠️  ${name}: ${envVar} is not set (optional)`);
      warnings.push(`${name}: ${envVar} is optional but recommended`);
    }
    return false;
  }
};

// 1. Environment Variables Check
console.log('\n📋 1. ENVIRONMENT VARIABLES');
console.log('-'.repeat(60));
checkEnv('Node Environment', 'NODE_ENV');
checkEnv('Server Port', 'PORT');
checkEnv('MongoDB URI', 'MONGODB_URI');
checkEnv('JWT Secret', 'JWT_SECRET');
checkEnv('JWT Expiry', 'JWT_EXPIRES_IN');
checkEnv('Refresh Token Secret', 'REFRESH_TOKEN_SECRET');
checkEnv('Frontend URL', 'FRONTEND_URL');
checkEnv('CORS Origin', 'CORS_ORIGIN');

// 2. AWS/Storage Configuration
console.log('\n☁️  2. STORAGE CONFIGURATION');
console.log('-'.repeat(60));
const hasAWS = checkEnv('AWS Access Key', 'AWS_ACCESS_KEY_ID', false);
if (hasAWS) {
  checkEnv('AWS Secret Key', 'AWS_SECRET_ACCESS_KEY');
  checkEnv('AWS Region', 'AWS_REGION');
  checkEnv('AWS S3 Bucket', 'AWS_S3_BUCKET_NAME');
}

// 3. Email Configuration
console.log('\n📧 3. EMAIL CONFIGURATION');
console.log('-'.repeat(60));
const hasSendGrid = checkEnv('SendGrid API Key', 'SENDGRID_API_KEY', false);
const hasSMTP = checkEnv('SMTP Host', 'SMTP_HOST', false);

if (!hasSendGrid && !hasSMTP) {
  console.log('⚠️  Warning: No email service configured (SendGrid or SMTP)');
  warnings.push('Email service: Neither SendGrid nor SMTP is configured');
}

if (hasSendGrid) {
  checkEnv('Email From Address', 'EMAIL_FROM');
}

// 4. Security Configuration
console.log('\n🔒 4. SECURITY CONFIGURATION');
console.log('-'.repeat(60));
check(
  'Production Mode',
  process.env.NODE_ENV === 'production',
  'NODE_ENV should be "production"',
  'NODE_ENV is not set to production'
);

check(
  'Secure Cookies',
  process.env.SECURE_COOKIES === 'true',
  'SECURE_COOKIES should be true in production',
  'SECURE_COOKIES is not enabled'
);

check(
  'Strong JWT Secret',
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
  'JWT_SECRET should be at least 32 characters',
  'JWT_SECRET is too short'
);

// 5. File System Check
console.log('\n📁 5. FILE SYSTEM');
console.log('-'.repeat(60));
const uploadsDir = path.join(__dirname, '../uploads');
check(
  'Uploads Directory',
  fs.existsSync(uploadsDir),
  'Uploads directory does not exist',
  'Uploads directory not found'
);

const logsDir = path.join(__dirname, '../logs');
check(
  'Logs Directory',
  fs.existsSync(logsDir),
  'Logs directory does not exist',
  'Logs directory not found'
);

// 6. Database Connection Test
console.log('\n🗄️  6. DATABASE CONNECTION');
console.log('-'.repeat(60));

const testDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB Connection: Successfully connected');
    passed++;
    
    // Test basic operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Database Access: Found ${collections.length} collections`);
    passed++;
    
    await mongoose.connection.close();
    return true;
  } catch (error) {
    console.log(`❌ MongoDB Connection: ${error.message}`);
    errors.push(`Database: ${error.message}`);
    return false;
  }
};

// 7. Dependencies Check
console.log('\n📦 7. DEPENDENCIES');
console.log('-'.repeat(60));
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

check(
  'Package.json exists',
  !!packageJson,
  'package.json not found'
);

check(
  'Start script defined',
  !!packageJson.scripts?.start,
  'Start script not defined in package.json'
);

check(
  'Node version specified',
  !!packageJson.engines?.node,
  'Node version not specified in package.json',
  'Node version not specified'
);

// 8. Critical Files Check
console.log('\n📄 8. CRITICAL FILES');
console.log('-'.repeat(60));
const criticalFiles = [
  'server.js',
  'package.json',
  'package-lock.json'
];

criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  check(
    `File: ${file}`,
    fs.existsSync(filePath),
    `${file} not found`
  );
});

// Run async checks
(async () => {
  total += 2; // For database checks
  await testDatabase();

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log('\n❌ CRITICAL ERRORS:');
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
  }

  console.log('\n' + '='.repeat(60));
  
  if (errors.length === 0) {
    console.log('✅ DEPLOYMENT READY!');
    console.log('\nNext steps:');
    console.log('1. Commit your changes: git add . && git commit -m "Ready for deployment"');
    console.log('2. Push to your repository: git push');
    console.log('3. Deploy to your hosting platform (Render/Heroku/etc.)');
    console.log('4. Update FRONTEND_URL and CORS_ORIGIN in production environment');
    process.exit(0);
  } else {
    console.log('❌ NOT READY FOR DEPLOYMENT');
    console.log('\nPlease fix the errors above before deploying.');
    process.exit(1);
  }
})();
