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
    'config.production.env',
    'Dockerfile'
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

function generateAzureDeploymentGuide() {
  console.log('\n🚀 Azure Deployment Guide:\n');
  
  console.log('1. Build Docker Image:');
  console.log('   docker build -t claim-app-backend .');
  console.log('');
  
  console.log('2. Test Locally:');
  console.log('   docker run -p 5000:5000 --env-file config.production.env claim-app-backend');
  console.log('');
  
  console.log('3. Deploy to Azure Container Instances:');
  console.log('   az container create \\');
  console.log('     --resource-group your-resource-group \\');
  console.log('     --name claim-app-backend \\');
  console.log('     --image claim-app-backend \\');
  console.log('     --ports 5000 \\');
  console.log('     --environment-variables \\');
  console.log('       NODE_ENV=production \\');
  console.log('       MONGODB_URI="your-mongodb-uri" \\');
  console.log('       JWT_SECRET="your-jwt-secret"');
  console.log('');
  
  console.log('4. Or deploy to Azure App Service:');
  console.log('   - Create an App Service with Node.js runtime');
  console.log('   - Configure environment variables in Application Settings');
  console.log('   - Deploy using Azure CLI or GitHub Actions');
  console.log('');
  
  console.log('5. Configure Application Insights:');
  console.log('   - Create Application Insights resource in Azure');
  console.log('   - Update APPLICATIONINSIGHTS_CONNECTION_STRING');
  console.log('   - Monitor application performance and errors');
  console.log('');
}

function main() {
  console.log('🏗️  Production Deployment Validation\n');
  console.log('=====================================\n');
  
  const envValid = validateEnvironment();
  const structureValid = checkFileStructure();
  
  if (envValid && structureValid) {
    console.log('\n🎉 All validations passed! Your application is ready for production deployment.');
    generateAzureDeploymentGuide();
  } else {
    console.log('\n❌ Please fix the issues above before deploying to production.');
    process.exit(1);
  }
}

// Run the script
main();
