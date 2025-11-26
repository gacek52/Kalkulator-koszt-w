/**
 * Toast Notification Utilities
 *
 * Centralna funkcja do pokazywania powiadomień.
 * Stopniowo zastępuje alert() i console.log() w aplikacji.
 *
 * @module utils/notifications
 */

import toast from 'react-hot-toast';

/**
 * Helper functions dla toast notifications
 */
export const notify = {
  /**
   * Success notification (zielona)
   * @param {string} message - Wiadomość do wyświetlenia
   * @param {object} options - Opcje dla toast
   */
  success: (message, options = {}) => {
    return toast.success(message, {
      ...options,
    });
  },

  /**
   * Error notification (czerwona)
   * @param {string} message - Wiadomość do wyświetlenia
   * @param {object} options - Opcje dla toast
   */
  error: (message, options = {}) => {
    return toast.error(message, {
      ...options,
    });
  },

  /**
   * Info notification (niebieska)
   * @param {string} message - Wiadomość do wyświetlenia
   * @param {object} options - Opcje dla toast
   */
  info: (message, options = {}) => {
    return toast(message, {
      icon: 'ℹ️',
      ...options,
    });
  },

  /**
   * Warning notification (żółta)
   * @param {string} message - Wiadomość do wyświetlenia
   * @param {object} options - Opcje dla toast
   */
  warning: (message, options = {}) => {
    return toast(message, {
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#fff',
      },
      ...options,
    });
  },

  /**
   * Loading notification (spinner)
   * Zwraca ID toastu który można użyć do dismissal
   * @param {string} message - Wiadomość do wyświetlenia
   * @returns {string} Toast ID
   */
  loading: (message) => {
    return toast.loading(message);
  },

  /**
   * Dismiss specific toast
   * @param {string} toastId - ID toastu do zamknięcia
   */
  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },

  /**
   * Promise-based notification
   * Pokazuje loading, potem success lub error w zależności od wyniku
   * @param {Promise} promise - Promise do monitorowania
   * @param {object} messages - Wiadomości dla różnych stanów
   * @param {string} messages.loading - Wiadomość podczas ładowania
   * @param {string} messages.success - Wiadomość po sukcesie
   * @param {string} messages.error - Wiadomość po błędzie
   */
  promise: (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Ładowanie...',
      success: messages.success || 'Sukces!',
      error: messages.error || 'Wystąpił błąd',
    });
  },

  /**
   * Custom notification z własnym contentem
   * @param {React.Component} content - Komponent do wyświetlenia
   * @param {object} options - Opcje dla toast
   */
  custom: (content, options = {}) => {
    return toast.custom(content, options);
  },
};

/**
 * Przykłady użycia:
 *
 * // Sukces
 * notify.success('Kalkulacja zapisana!');
 *
 * // Błąd
 * notify.error('Nie udało się zapisać kalkulacji');
 *
 * // Info
 * notify.info('Wczytywanie danych...');
 *
 * // Warning
 * notify.warning('Niektóre pola nie są wypełnione');
 *
 * // Loading z dismissal
 * const toastId = notify.loading('Zapisywanie...');
 * // ... po zakończeniu:
 * notify.dismiss(toastId);
 * notify.success('Zapisano!');
 *
 * // Promise
 * notify.promise(
 *   saveCalculation(),
 *   {
 *     loading: 'Zapisywanie kalkulacji...',
 *     success: 'Kalkulacja zapisana!',
 *     error: 'Nie udało się zapisać'
 *   }
 * );
 */

export default notify;
