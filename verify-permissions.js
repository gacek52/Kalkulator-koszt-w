const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verifyPermissions() {
  try {
    console.log('🔍 Sprawdzanie uprawnień dla gacek52@gmail.com...\n');
    
    // 1. Sprawdź użytkownika
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', 'gacek52@gmail.com').get();
    
    if (userSnapshot.empty) {
      console.log('❌ BŁĄD: Użytkownik nie istnieje w Firestore!');
      process.exit(1);
    }
    
    let userData;
    let userId;
    userSnapshot.forEach(doc => {
      userId = doc.id;
      userData = doc.data();
    });
    
    console.log('✅ Użytkownik znaleziony:');
    console.log('   UID:', userId);
    console.log('   Email:', userData.email);
    console.log('   Rola:', userData.role);
    console.log('   Provider:', userData.provider);
    console.log('   Disabled:', userData.disabled);
    console.log('');
    
    // 2. Sprawdź czy rola istnieje
    const roleDoc = await db.collection('roles').doc(userData.role).get();
    
    if (!roleDoc.exists) {
      console.log(`❌ BŁĄD: Rola "${userData.role}" nie istnieje w kolekcji roles!`);
      process.exit(1);
    }
    
    const roleData = roleDoc.data();
    console.log(`✅ Rola "${userData.role}" znaleziona:`);
    console.log('   Nazwa:', roleData.name);
    console.log('   Chroniona:', roleData.protected);
    console.log('');
    
    // 3. Sprawdź uprawnienia
    console.log('📋 Uprawnienia roli:');
    const permissions = roleData.permissions;
    
    const criticalPerms = {
      'users_view': 'Podgląd użytkowników',
      'users_create': 'Tworzenie użytkowników', 
      'users_edit': 'Edycja użytkowników',
      'roles_manage': 'Zarządzanie rolami (TYLKO super-admin)'
    };
    
    for (const [key, desc] of Object.entries(criticalPerms)) {
      const status = permissions[key] ? '✅' : '❌';
      console.log(`   ${status} ${key}: ${desc}`);
    }
    
    console.log('');
    console.log('📊 Podsumowanie:');
    const totalPerms = Object.keys(permissions).length;
    const activePerms = Object.values(permissions).filter(v => v === true).length;
    console.log(`   Wszystkie uprawnienia: ${totalPerms}`);
    console.log(`   Aktywne uprawnienia: ${activePerms}`);
    
    // 4. Diagnoza
    console.log('');
    if (userData.role !== 'super-admin') {
      console.log('⚠️  PROBLEM: Twoja rola to "' + userData.role + '" zamiast "super-admin"!');
      console.log('   Poprawiam...');
      
      await db.collection('users').doc(userId).update({
        role: 'super-admin',
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Rola zaktualizowana na "super-admin"');
    } else if (!permissions.roles_manage) {
      console.log('⚠️  PROBLEM: Rola super-admin nie ma uprawnienia "roles_manage"!');
    } else {
      console.log('✅ Wszystko OK! Uprawnienia są prawidłowe.');
    }
    
    console.log('');
    console.log('👉 WYLOGUJ SIĘ i ZALOGUJ PONOWNIE w aplikacji!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd:', error);
    process.exit(1);
  }
}

verifyPermissions();
