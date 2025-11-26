/**
 * Toast Notification Provider
 *
 * Wrapper dla react-hot-toast z konfiguracją dla aplikacji
 * Używany do zastąpienia alert() i console.log() z lepszym UX
 */

import { Toaster } from 'react-hot-toast';

/**
 * Provider dla toast notifications
 * Umieść w głównym App.js jako wrapper
 */
export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '500px',
        },

        // Success
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },

        // Error
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },

        // Loading
        loading: {
          duration: Infinity,
        },
      }}
    />
  );
};

export default ToastProvider;
