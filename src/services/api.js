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
 * Get Firebase Auth token for current user
 */
async function getAuthToken() {
  // Import auth dynamically to avoid circular dependency
  const { auth } = await import('../firebase');
  const user = auth.currentUser;

  if (!user) {
    throw new ApiError('User not authenticated', 401);
  }

  return await user.getIdToken();
}

/**
 * Podstawowa funkcja do wykonywania requestów
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    // Get Firebase Auth token
    const token = await getAuthToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

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
 * API endpoints dla typów materiałów
 */
export const materialTypesApi = {
  getAll: () => request('/material-types'),

  getById: (id) => request(`/material-types/${id}`),

  create: (materialType) =>
    request('/material-types', {
      method: 'POST',
      body: JSON.stringify(materialType),
    }),

  update: (id, materialType) =>
    request(`/material-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(materialType),
    }),

  delete: (id) =>
    request(`/material-types/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * API endpoints dla kompozycji materiałów
 */
export const materialCompositionsApi = {
  getAll: () => request('/material-compositions'),

  getById: (id) => request(`/material-compositions/${id}`),

  create: (composition) =>
    request('/material-compositions', {
      method: 'POST',
      body: JSON.stringify(composition),
    }),

  update: (id, composition) =>
    request(`/material-compositions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(composition),
    }),

  delete: (id) =>
    request(`/material-compositions/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * API endpoints dla typów opakowań
 */
export const packagingTypesApi = {
  getAll: () => request('/packaging-types'),

  getById: (id) => request(`/packaging-types/${id}`),

  create: (packagingType) =>
    request('/packaging-types', {
      method: 'POST',
      body: JSON.stringify(packagingType),
    }),

  update: (id, packagingType) =>
    request(`/packaging-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(packagingType),
    }),

  delete: (id) =>
    request(`/packaging-types/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * API endpoints dla kompozycji opakowań
 */
export const packagingCompositionsApi = {
  getAll: () => request('/packaging-compositions'),

  getById: (id) => request(`/packaging-compositions/${id}`),

  create: (composition) =>
    request('/packaging-compositions', {
      method: 'POST',
      body: JSON.stringify(composition),
    }),

  update: (id, composition) =>
    request(`/packaging-compositions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(composition),
    }),

  delete: (id) =>
    request(`/packaging-compositions/${id}`, {
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
 * API endpoints dla sesji (per użytkownik)
 */
export const sessionApi = {
  get: (userId) => request(`/session?userId=${encodeURIComponent(userId)}`),

  save: (userId, session) =>
    request('/session', {
      method: 'POST',
      body: JSON.stringify({ userId, ...session }),
    }),

  delete: (userId) =>
    request(`/session?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),
};

/**
 * Health check endpoint
 */
export const healthCheck = () => request('/health');

export { ApiError };
