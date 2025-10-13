#!/bin/bash
# Script to fix admin role for gacek52@gmail.com
# This requires the user to be already logged in to the app at least once

echo "🔍 Checking Firebase users collection..."

# First, get the UID of the user (you need to get this from Firebase Console)
# Or we can use the Firebase Auth lookup

echo ""
echo "📝 MANUAL STEPS:"
echo ""
echo "1. Otwórz Firebase Console: https://console.firebase.google.com/project/kalkulator-produkcyjny---alpha/firestore/data/users"
echo ""
echo "2. Znajdź dokument użytkownika z emailem: gacek52@gmail.com"
echo ""
echo "3. Kliknij na dokument i edytuj pole 'role'"
echo ""
echo "4. Zmień wartość na: admin"
echo ""
echo "5. Kliknij 'Update'"
echo ""
echo "✅ Gotowe! Wyloguj się i zaloguj ponownie, aby zobaczyć uprawnienia admina."
echo ""
