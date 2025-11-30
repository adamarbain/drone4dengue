#!/usr/bin/env node
/**
 * Helper script to extract Firebase environment variables from service account JSON
 * Usage: node setup-firebase-env.js <path-to-service-account.json>
 * 
 * This will output the environment variables you need to set in Render
 */

const fs = require('fs');
const path = require('path');

// Get the JSON file path from command line or use default
const jsonPath = process.argv[2] || path.join(__dirname, 'service-account.json');

if (!fs.existsSync(jsonPath)) {
  console.error(`Error: File not found: ${jsonPath}`);
  console.error('Usage: node setup-firebase-env.js <path-to-service-account.json>');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Extract values
  const projectId = serviceAccount.project_id;
  const clientEmail = serviceAccount.client_email;
  const privateKey = serviceAccount.private_key;
  const storageBucket = serviceAccount.storageBucket || `${projectId}.appspot.com`;
  
  // Encode private key to base64
  const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
  
  console.log('\n=== Firebase Environment Variables for Render ===\n');
  console.log('Set these in your Render dashboard:\n');
  console.log(`FIREBASE_PROJECT_ID=${projectId}`);
  console.log(`FIREBASE_CLIENT_EMAIL=${clientEmail}`);
  console.log(`FIREBASE_STORAGE_BUCKET=${storageBucket}`);
  console.log(`\nFIREBASE_PRIVATE_KEY_BASE64=${privateKeyBase64}`);
  console.log('\n=== Alternative: Use Full JSON (base64 encoded) ===\n');
  
  // Also provide the full JSON as base64
  const fullJsonBase64 = Buffer.from(JSON.stringify(serviceAccount)).toString('base64');
  console.log('If you prefer to use FIREBASE_SERVICE_ACCOUNT_JSON instead:');
  console.log(`FIREBASE_SERVICE_ACCOUNT_JSON=${fullJsonBase64}`);
  console.log('\n=== Recommendation ===');
  console.log('For Render, use the individual variables (FIREBASE_PROJECT_ID, etc.)');
  console.log('with FIREBASE_PRIVATE_KEY_BASE64 - this is more reliable.\n');
  
} catch (error) {
  console.error('Error processing service account JSON:', error.message);
  process.exit(1);
}

