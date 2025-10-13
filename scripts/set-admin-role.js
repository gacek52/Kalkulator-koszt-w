/**
 * Script to manually set admin role for a user in Firestore
 *
 * Usage:
 *   node scripts/set-admin-role.js <email>
 *
 * Example:
 *   node scripts/set-admin-role.js gacek52@gmail.com
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setAdminRole(email) {
  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;

    console.log(`Found user: ${email} (UID: ${uid})`);

    // Update role in Firestore
    await db.collection('users').doc(uid).set({
      role: 'admin',
      lastLogin: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ Successfully set admin role for ${email}`);

    // Display updated user data
    const userDoc = await db.collection('users').doc(uid).get();
    console.log('\nUpdated user data:', userDoc.data());

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/set-admin-role.js <email>');
  console.error('Example: node scripts/set-admin-role.js gacek52@gmail.com');
  process.exit(1);
}

setAdminRole(email);
