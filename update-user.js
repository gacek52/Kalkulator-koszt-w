const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateUser() {
  try {
    const userId = 'TzblRzKp5TTF77GLKAzOr2srvtF3';
    
    await db.collection('users').doc(userId).update({
      provider: 'google',
      disabled: false,
      loginHistory: [],
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Profil użytkownika zaktualizowany!');
    console.log('');
    console.log('Dodano:');
    console.log('  - provider: google');
    console.log('  - disabled: false');
    console.log('  - loginHistory: []');
    console.log('');
    console.log('👉 Teraz wyloguj się i zaloguj ponownie w aplikacji');
    
    process.exit(0);
  } catch (error) {
    console.error('Błąd:', error);
    process.exit(1);
  }
}

updateUser();
