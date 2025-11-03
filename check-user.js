const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUser() {
  try {
    // Znajdź użytkownika po emailu gacek52@gmail.com
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', 'gacek52@gmail.com').get();
    
    if (snapshot.empty) {
      console.log('❌ NIE ZNALEZIONO użytkownika gacek52@gmail.com w kolekcji users');
      console.log('\n🔧 To normalne przy pierwszym logowaniu - musisz się zalogować raz przez aplikację');
      console.log('👉 Zaloguj się na: https://kalkulator-produkcyjny---alpha.web.app');
      console.log('   Wybierz: Google > gacek52@gmail.com');
      console.log('   System automatycznie utworzy profil z rolą super-admin');
    } else {
      console.log('✓ Znaleziono użytkownika:');
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('\nUID:', doc.id);
        console.log('Email:', data.email);
        console.log('Rola:', data.role);
        console.log('Provider:', data.provider);
        console.log('Disabled:', data.disabled);
        console.log('Utworzono:', data.createdAt);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Błąd:', error);
    process.exit(1);
  }
}

checkUser();
