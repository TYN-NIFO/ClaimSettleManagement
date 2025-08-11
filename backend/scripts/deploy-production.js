#!/usr/bin/env node

/**
 * Production Deployment Script
 * Validates environment variables and provides deployment guidance
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load production environment variables
dotenv.config({ path: 'config.production.env' });

const requiredEnvVars = [
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'REFRESH_TOKEN_SECRET',
  'REFRESH_TOKEN_EXPIRES_IN',
  'FRONTEND_URL',
  'MAX_FILE_SIZE',
  'UPLOAD_PATH',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'APPLICATIONINSIGHTS_CONNECTION_STRING'
];

const optionalEnvVars = [
  'PORT',
  'CORS_ORIGIN',
  'API_BASE_URL',
  'COOKIE_SECRET',
  'SECURE_COOKIES',
  'LOG_LEVEL',
  'LOG_FILE'
];

function validateEnvironment() {
  console.log('🔍 Validating production environment variables...\n');
  
  let isValid = true;
  const missing = [];
  const warnings = [];
  
  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
      isValid = false;
    }
  }
  
  // Check optional variables and provide warnings
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }
  
  // Validate specific values
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️  Warning: NODE_ENV should be set to "production"');
  }
  
  if (!process.env.MONGODB_URI?.includes('mongodb+srv://')) {
    console.log('⚠️  Warning: MONGODB_URI should use MongoDB Atlas connection string');
  }
  
  if (process.env.FRONTEND_URL === 'https://YOUR-PROD-FRONTEND-DOMAIN') {
    console.log('⚠️  Warning: FRONTEND_URL should be updated to your actual domain');
  }
  
  // Report results
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(varName => console.log(`   - ${varName}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Optional environment variables not set:');
    warnings.forEach(varName => console.log(`   - ${varName}`));
    console.log('');
  }
  
  if (isValid) {
    console.log('✅ All required environment variables are set!');
  } else {
    console.log('❌ Environment validation failed. Please set all required variables.');
  }
  
  return isValid;
}

function checkFileStructure() {
  console.log('\n📁 Checking file structure...\n');
  
  const requiredFiles = [
    'server.js',
    'package.json',
    'config.production.env'
  ];
  
  const requiredDirs = [
    'routes',
    'controllers',
    'models',
    'middleware',
    'uploads',
    'logs'
  ];
  
  let isValid = true;
  
  // Check required files
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.log(`❌ Missing required file: ${file}`);
      isValid = false;
    } else {
      console.log(`✅ Found: ${file}`);
    }
  }
  
  // Check required directories
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.log(`❌ Missing required directory: ${dir}`);
      isValid = false;
    } else {
      console.log(`✅ Found: ${dir}/`);
    }
  }
  
  return isValid;
}

function generateDeploymentGuide() {
  console.log('\n🚀 Deployment Guide:\n');
  
  console.log('✅ Current Status: Backend is deployed on Render');
  console.log('🌐 URL: https://claimsettlemanagement.onrender.com/api');
  console.log('');
  
  console.log('📝 To update deployment:');
  console.log('1. Push changes to your Git repository');
  console.log('2. Render automatically redeploys');
  console.log('3. No additional setup needed');
  console.log('');
  
  console.log('🔧 Alternative deployment options:');
  console.log('');
  console.log('Azure App Service:');
  console.log('   az webapp up --name your-app-name --resource-group your-group');
  console.log('');
  
  console.log('Heroku:');
  console.log('   heroku create && git push heroku main');
  console.log('');
  
  console.log('Railway:');
  console.log('   railway login && railway up');
  console.log('');
  
  console.log('📊 Monitor your application:');
  console.log('   - Health check: GET /api/health');
  console.log('   - Application logs in Render dashboard');
  console.log('   - Database connectivity status');
  console.log('');
}

function main() {
  console.log('🏗️  Production Deployment Validation\n');
  console.log('=====================================\n');
  
  const envValid = validateEnvironment();
  const structureValid = checkFileStructure();
  
  if (envValid && structureValid) {
    console.log('\n🎉 All validations passed! Your application is ready for production deployment.');
    generateDeploymentGuide();
  } else {
    console.log('\n❌ Please fix the issues above before deploying to production.');
    process.exit(1);
  }
}

// Run the script
main();
