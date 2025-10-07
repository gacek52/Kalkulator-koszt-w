/**
 * API Client Service
 *
 * Centralna obsługa komunikacji z backendem.
 * Automatycznie obsługuje błędy i odpowiedzi.
 *
 * W development: używa proxy (localhost:3001)
 * W production: używa relatywnych URLi (ten sam serwer)
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Podstawowa funkcja do wykonywania requestów
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || 'Request failed',
        response.status,
        data.error?.details
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error lub parsing error
    throw new ApiError(
      'Network error - unable to connect to server',
      0,
      error.message
    );
  }
}

/**
 * API endpoints dla katalogu kalkulacji
 */
export const catalogApi = {
  getAll: () => request('/catalog'),

  getById: (id) => request(`/catalog/${id}`),

  create: (calculation) =>
    request('/catalog', {
      method: 'POST',
      body: JSON.stringify(calculation),
    }),

  update: (id, calculation) =>
    request(`/catalog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(calculation),
    }),

  delete: (id) =>
    request(`/catalog/${id}`, {
      method: 'DELETE',
    }),

  search: (query) => request(`/catalog/search/${encodeURIComponent(query)}`),
};

/**
 * API endpoints dla klientów
 */
export const clientsApi = {
  getAll: () => request('/clients'),

  getById: (id) => request(`/clients/${id}`),

  create: (client) =>
    request('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    }),

  update: (id, client) =>
    request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    }),

  delete: (id) =>
    request(`/clients/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * API endpoints dla materiałów
 */
export const materialsApi = {
  getAll: () => request('/materials'),

  getById: (id) => request(`/materials/${id}`),

  create: (material) =>
    request('/materials', {
      method: 'POST',
      body: JSON.stringify(material),
    }),

  update: (id, material) =>
    request(`/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(material),
    }),

  delete: (id) =>
    request(`/materials/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * API endpoints dla opakowań
 */
export const packagingApi = {
  getAll: () => request('/packaging'),

  getById: (id) => request(`/packaging/${id}`),

  create: (packaging) =>
    request('/packaging', {
      method: 'POST',
      body: JSON.stringify(packaging),
    }),

  update: (id, packaging) =>
    request(`/packaging/${id}`, {
      method: 'PUT',
      body: JSON.stringify(packaging),
    }),

  delete: (id) =>
    request(`/packaging/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * API endpoints dla instrukcji klientów
 */
export const clientManualApi = {
  getAll: () => request('/client-manual'),

  getById: (id) => request(`/client-manual/${id}`),

  create: (manual) =>
    request('/client-manual', {
      method: 'POST',
      body: JSON.stringify(manual),
    }),

  update: (id, manual) =>
    request(`/client-manual/${id}`, {
      method: 'PUT',
      body: JSON.stringify(manual),
    }),

  delete: (id) =>
    request(`/client-manual/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * API endpoints dla sesji
 */
export const sessionApi = {
  get: () => request('/session'),

  save: (session) =>
    request('/session', {
      method: 'POST',
      body: JSON.stringify(session),
    }),

  delete: () =>
    request('/session', {
      method: 'DELETE',
    }),
};

/**
 * Health check endpoint
 */
export const healthCheck = () => request('/health');

export { ApiError };
