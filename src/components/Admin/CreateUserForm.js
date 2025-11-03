import React, { useState } from 'react';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Komponent formularza tworzenia nowego użytkownika Email/Password
 * Tylko dla adminów
 */
export function CreateUserForm({ darkMode, onClose, onUserCreated }) {
  const { getAvailableRoles } = useRole();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
    requirePasswordChange: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const availableRoles = getAvailableRoles();

  // Generuj losowe hasło (8 znaków: wielkie, małe, cyfry)
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Walidacja
    if (!formData.email || !formData.password) {
      setError('Email i hasło są wymagane');
      return;
    }

    if (formData.password.length < 6) {
      setError('Hasło musi mieć minimum 6 znaków');
      return;
    }

    setIsSubmitting(true);

    try {
      // Utwórz użytkownika w Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Utwórz profil użytkownika w Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: formData.email,
        role: formData.role,
        provider: 'email',
        disabled: false,
        requirePasswordChange: formData.requirePasswordChange,
        createdAt: new Date().toISOString(),
        loginHistory: []
      });

      // Wywołaj callback
      if (onUserCreated) {
        onUserCreated({
          uid: user.uid,
          email: formData.email,
          role: formData.role,
          provider: 'email'
        });
      }

      // Pokaż hasło użytkownikowi (jedyna szansa na odczyt)
      alert(
        `Użytkownik został utworzony!\n\n` +
        `Email: ${formData.email}\n` +
        `Hasło: ${formData.password}\n\n` +
        `WAŻNE: Zapisz hasło, nie będzie można go później odczytać!\n` +
        (formData.requirePasswordChange ? 'Użytkownik będzie musiał zmienić hasło przy pierwszym logowaniu.' : '')
      );

      onClose();
    } catch (error) {
      console.error('Błąd tworzenia użytkownika:', error);

      // Obsługa błędów Firebase
      if (error.code === 'auth/email-already-in-use') {
        setError('Ten adres email jest już używany');
      } else if (error.code === 'auth/invalid-email') {
        setError('Nieprawidłowy adres email');
      } else if (error.code === 'auth/weak-password') {
        setError('Hasło jest zbyt słabe');
      } else {
        setError('Nie udało się utworzyć użytkownika: ' + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeClasses = darkMode ? {
    background: 'bg-gray-900',
    card: 'bg-gray-800 border-gray-700',
    text: {
      primary: 'text-white',
      secondary: 'text-gray-400',
      muted: 'text-gray-500'
    },
    input: 'bg-gray-700 border-gray-600 text-white focus:border-blue-500',
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-white'
    }
  } : {
    background: 'bg-gray-50',
    card: 'bg-white border-gray-200',
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      muted: 'text-gray-500'
    },
    input: 'bg-white border-gray-300 text-gray-900 focus:border-blue-500',
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900'
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.card} rounded-lg shadow-xl max-w-md w-full border`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${themeClasses.text.primary}`}>
            Utwórz nowego użytkownika
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700`}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-1`}>
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              placeholder="user@example.com"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Hasło */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-1`}>
              Hasło *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input} pr-10`}
                  placeholder="Minimum 6 znaków"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className={`px-3 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
                title="Generuj losowe hasło"
                disabled={isSubmitting}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p className={`text-xs ${themeClasses.text.muted} mt-1`}>
              Kliknij ikonę by pokazać/ukryć hasło lub wygenerować losowe
            </p>
          </div>

          {/* Rola */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-1`}>
              Rola *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              required
              disabled={isSubmitting}
            >
              {availableRoles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox - wymuszenie zmiany hasła */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="requirePasswordChange"
              checked={formData.requirePasswordChange}
              onChange={(e) => setFormData({ ...formData, requirePasswordChange: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <label htmlFor="requirePasswordChange" className={`text-sm ${themeClasses.text.primary} cursor-pointer`}>
              Wymagaj zmiany hasła przy pierwszym logowaniu
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
              disabled={isSubmitting}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Tworzę...' : 'Utwórz użytkownika'}
            </button>
          </div>

          {/* Info */}
          <div className={`bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3`}>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Ważne:</strong> Hasło zostanie pokazane tylko raz po utworzeniu konta.
              Upewnij się, że przekażesz je użytkownikowi w bezpieczny sposób.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
