import React, { useState } from 'react';
import { X, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { changeUserPassword } from '../../firebase';

/**
 * Dialog wymuszonej zmiany hasła przy pierwszym logowaniu
 */
export function PasswordChangeDialog({ darkMode, onClose, onPasswordChanged, isRequired = false }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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

  // Walidacja siły hasła
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password)
    };

    return {
      isValid: Object.values(requirements).every(Boolean),
      requirements
    };
  };

  const passwordValidation = validatePassword(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Walidacja
    if (!newPassword || !confirmPassword) {
      setError('Wszystkie pola są wymagane');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Hasła nie są identyczne');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('Hasło nie spełnia wymagań bezpieczeństwa');
      return;
    }

    setIsSubmitting(true);

    try {
      await changeUserPassword(newPassword);
      setSuccess(true);

      // Poczekaj 2 sekundy przed zamknięciem
      setTimeout(() => {
        if (onPasswordChanged) {
          onPasswordChanged();
        }
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error.message || 'Nie udało się zmienić hasła');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.card} rounded-lg shadow-xl max-w-md w-full border`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-xl font-bold ${themeClasses.text.primary}`}>
              {isRequired ? 'Wymagana zmiana hasła' : 'Zmień hasło'}
            </h2>
            {isRequired && (
              <p className={`text-sm ${themeClasses.text.secondary} mt-1`}>
                Musisz zmienić hasło przy pierwszym logowaniu
              </p>
            )}
          </div>
          {!isRequired && (
            <button
              onClick={onClose}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700`}
              disabled={isSubmitting || success}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Success message */}
        {success ? (
          <div className="p-6">
            <div className="text-center">
              <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
              <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-2`}>
                Hasło zostało zmienione!
              </h3>
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                Możesz teraz korzystać z nowego hasła
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nowe hasło */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-1`}>
                  Nowe hasło *
                </label>
                <div className="relative">
                  <Lock size={20} className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.text.muted}`} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg ${themeClasses.input}`}
                    placeholder="Minimum 8 znaków"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    disabled={isSubmitting}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Wymagania hasła */}
              {newPassword && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-xs font-medium ${themeClasses.text.secondary} mb-2`}>
                    Wymagania hasła:
                  </p>
                  <ul className="space-y-1 text-xs">
                    <li className={passwordValidation.requirements.length ? 'text-green-600' : themeClasses.text.muted}>
                      {passwordValidation.requirements.length ? '✓' : '○'} Minimum 8 znaków
                    </li>
                    <li className={passwordValidation.requirements.uppercase ? 'text-green-600' : themeClasses.text.muted}>
                      {passwordValidation.requirements.uppercase ? '✓' : '○'} Jedna wielka litera
                    </li>
                    <li className={passwordValidation.requirements.lowercase ? 'text-green-600' : themeClasses.text.muted}>
                      {passwordValidation.requirements.lowercase ? '✓' : '○'} Jedna mała litera
                    </li>
                    <li className={passwordValidation.requirements.number ? 'text-green-600' : themeClasses.text.muted}>
                      {passwordValidation.requirements.number ? '✓' : '○'} Jedna cyfra
                    </li>
                  </ul>
                </div>
              )}

              {/* Potwierdzenie hasła */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-1`}>
                  Potwierdź hasło *
                </label>
                <div className="relative">
                  <Lock size={20} className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.text.muted}`} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg ${themeClasses.input}`}
                    placeholder="Powtórz nowe hasło"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">
                    Hasła nie są identyczne
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                {!isRequired && (
                  <button
                    type="button"
                    onClick={onClose}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
                    disabled={isSubmitting}
                  >
                    Anuluj
                  </button>
                )}
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
                  disabled={isSubmitting || !passwordValidation.isValid || newPassword !== confirmPassword}
                >
                  {isSubmitting ? 'Zmieniam...' : 'Zmień hasło'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
