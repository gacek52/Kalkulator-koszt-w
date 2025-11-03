import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import './LoginScreen.css';

/**
 * Login Screen
 * Ekran logowania z opcjami: Anonymous (guest z nickiem), Google Sign-In i Email/Password
 */

function LoginScreen() {
  const { loginAsGuest, loginWithGoogle, loginWithEmail, loading, error } = useAuth();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState('guest'); // 'guest', 'email', 'google'
  const [localError, setLocalError] = useState('');

  const handleGuestLogin = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!nickname || nickname.trim().length < 2) {
      setLocalError('Nick musi mieć co najmniej 2 znaki');
      return;
    }

    try {
      await loginAsGuest(nickname);
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Email i hasło są wymagane');
      return;
    }

    try {
      await loginWithEmail(email, password);
    } catch (err) {
      setLocalError(err.message);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>Kalkulator Produkcyjny</h1>
          <p>Zaloguj się, aby kontynuować</p>
        </div>

        {(error || localError) && (
          <div className="login-error">
            {error || localError}
          </div>
        )}

        {/* Login mode tabs */}
        <div className="login-tabs">
          <button
            className={`login-tab ${loginMode === 'guest' ? 'active' : ''}`}
            onClick={() => setLoginMode('guest')}
            disabled={loading}
          >
            Gość
          </button>
          <button
            className={`login-tab ${loginMode === 'email' ? 'active' : ''}`}
            onClick={() => setLoginMode('email')}
            disabled={loading}
          >
            Email/Hasło
          </button>
          <button
            className={`login-tab ${loginMode === 'google' ? 'active' : ''}`}
            onClick={() => setLoginMode('google')}
            disabled={loading}
          >
            Google
          </button>
        </div>

        <div className="login-options">
          {/* Guest login */}
          {loginMode === 'guest' && (
            <div className="login-section">
              <h3>Kontynuuj jako gość</h3>
              <form onSubmit={handleGuestLogin} className="guest-form">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Podaj swój nick..."
                  className="nickname-input"
                  disabled={loading}
                  maxLength={30}
                  autoFocus
                />
                <button
                  type="submit"
                  className="login-button guest-button"
                  disabled={loading || !nickname.trim()}
                >
                  {loading ? 'Logowanie...' : 'Kontynuuj'}
                </button>
              </form>
              <p className="login-hint">
                Twój nick będzie widoczny przy kalkulacjach
              </p>
            </div>
          )}

          {/* Email/Password login */}
          {loginMode === 'email' && (
            <div className="login-section">
              <h3>Zaloguj się przez Email/Hasło</h3>
              <form onSubmit={handleEmailLogin} className="email-form">
                <div className="input-group">
                  <Mail size={20} className="input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="email-input"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <Lock size={20} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Hasło"
                    className="password-input"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="login-button email-button"
                  disabled={loading || !email || !password}
                >
                  {loading ? 'Logowanie...' : 'Zaloguj się'}
                </button>
              </form>
              <p className="login-hint">
                Konta Email/Hasło są tworzone przez administratora
              </p>
            </div>
          )}

          {/* Google Sign-In */}
          {loginMode === 'google' && (
            <div className="login-section">
              <h3>Zaloguj się przez Google</h3>
              <button
                onClick={handleGoogleLogin}
                className="login-button google-button"
                disabled={loading}
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Logowanie...' : 'Zaloguj przez Google'}
              </button>
              <p className="login-hint">
                Bezpieczne logowanie przez konto Google
              </p>
            </div>
          )}
        </div>

        <div className="login-footer">
          {loginMode === 'guest' && (
            <p>
              <strong>Tryb gości:</strong> Twoje dane będą zapisane, ale mogą zostać utracone po wylogowaniu
            </p>
          )}
          {loginMode === 'email' && (
            <p>
              <strong>Email/Hasło:</strong> Konto utworzone przez administratora z pełnym dostępem do systemu
            </p>
          )}
          {loginMode === 'google' && (
            <p>
              <strong>Google:</strong> Pełny dostęp do Twoich kalkulacji z każdego urządzenia
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
