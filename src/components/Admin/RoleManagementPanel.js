import React, { useState } from 'react';
import { Shield, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { useRole } from '../../context/RoleContext';

/**
 * Panel zarządzania rolami - tylko dla super-admin
 */
export function RoleManagementPanel({ darkMode, onBack }) {
  const { roles, createRole, updateRole, deleteRole, isSuperAdmin } = useRole();
  const [editingRole, setEditingRole] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    permissions: {},
    assignableByAdmin: false
  });

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
      primary: 'bg-blue-600 hover:bg-blue-700',
      secondary: 'bg-gray-700 hover:bg-gray-600',
      danger: 'bg-red-600 hover:bg-red-700',
      success: 'bg-green-600 hover:bg-green-700'
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
      primary: 'bg-blue-600 hover:bg-blue-700',
      secondary: 'bg-gray-200 hover:bg-gray-300',
      danger: 'bg-red-600 hover:bg-red-700',
      success: 'bg-green-600 hover:bg-green-700'
    }
  };

  // Lista wszystkich dostępnych uprawnień
  const allPermissions = {
    'Użytkownicy': [
      { key: 'users_view', label: 'Podgląd użytkowników' },
      { key: 'users_create', label: 'Tworzenie użytkowników' },
      { key: 'users_edit', label: 'Edycja użytkowników' },
      { key: 'users_delete', label: 'Usuwanie użytkowników' },
      { key: 'users_disable', label: 'Wyłączanie kont' },
      { key: 'users_view_history', label: 'Historia logowań' }
    ],
    'Role': [
      { key: 'roles_manage', label: 'Zarządzanie rolami' }
    ],
    'Kalkulacje': [
      { key: 'calculations_view_all', label: 'Podgląd wszystkich kalkulacji' },
      { key: 'calculations_view_own', label: 'Podgląd własnych kalkulacji' },
      { key: 'calculations_edit_all', label: 'Edycja wszystkich kalkulacji' },
      { key: 'calculations_edit_own', label: 'Edycja własnych kalkulacji' },
      { key: 'calculations_delete_all', label: 'Usuwanie wszystkich kalkulacji' },
      { key: 'calculations_delete_own', label: 'Usuwanie własnych kalkulacji' }
    ],
    'Materiały': [
      { key: 'materials_view', label: 'Podgląd materiałów' },
      { key: 'materials_edit', label: 'Edycja materiałów' },
      { key: 'materials_sync', label: 'Synchronizacja materiałów' }
    ],
    'Klienci': [
      { key: 'clients_view_all', label: 'Podgląd wszystkich klientów' },
      { key: 'clients_view_own', label: 'Podgląd własnych klientów' },
      { key: 'clients_edit_all', label: 'Edycja wszystkich klientów' },
      { key: 'clients_edit_own', label: 'Edycja własnych klientów' },
      { key: 'clients_delete', label: 'Usuwanie klientów' }
    ],
    'Pakowanie': [
      { key: 'packaging_view', label: 'Podgląd pakowania' },
      { key: 'packaging_edit', label: 'Edycja pakowania' },
      { key: 'packaging_sync', label: 'Synchronizacja pakowania' }
    ],
    'Transport': [
      { key: 'transport_view', label: 'Podgląd transportu' },
      { key: 'transport_edit', label: 'Edycja transportu' },
      { key: 'transport_sync', label: 'Synchronizacja transportu' }
    ],
    'Stanowiska': [
      { key: 'workstations_view', label: 'Podgląd stanowisk' },
      { key: 'workstations_edit', label: 'Edycja stanowisk' },
      { key: 'workstations_capacity_view', label: 'Podgląd zajętości stanowisk' }
    ],
    'Katalog': [
      { key: 'catalog_view_all', label: 'Podgląd wszystkich kalkulacji w katalogu' },
      { key: 'catalog_view_own', label: 'Podgląd własnych kalkulacji w katalogu' },
      { key: 'catalog_edit_all', label: 'Edycja wszystkich kalkulacji w katalogu' },
      { key: 'catalog_edit_own', label: 'Edycja własnych kalkulacji w katalogu' }
    ],
    'Ustawienia': [
      { key: 'settings_view', label: 'Podgląd ustawień' },
      { key: 'settings_edit', label: 'Edycja ustawień' }
    ],
    'Raporty': [
      { key: 'reports_view', label: 'Podgląd raportów' },
      { key: 'reports_export', label: 'Eksport raportów' }
    ],
    'Client Manual': [
      { key: 'client_manual_view', label: 'Podgląd Client Manual' },
      { key: 'client_manual_edit', label: 'Edycja Client Manual' }
    ]
  };

  // Nie pozwól na dostęp jeśli nie jesteś super-admin
  if (!isSuperAdmin()) {
    return (
      <div className={`min-h-screen ${themeClasses.background} flex items-center justify-center`}>
        <div className={`${themeClasses.card} border rounded-lg p-8 text-center max-w-md`}>
          <Shield size={48} className="text-red-600 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${themeClasses.text.primary} mb-2`}>
            Brak dostępu
          </h2>
          <p className={`${themeClasses.text.secondary} mb-4`}>
            Tylko Super Administrator może zarządzać rolami.
          </p>
          <button
            onClick={onBack}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} text-white`}
          >
            Powrót
          </button>
        </div>
      </div>
    );
  }

  const handleEdit = (role) => {
    setEditingRole(role.id);
    setFormData({
      id: role.id,
      name: role.name,
      permissions: { ...role.permissions },
      assignableByAdmin: role.assignableByAdmin || false
    });
  };

  const handleCreate = () => {
    setShowCreateForm(true);
    setFormData({
      id: '',
      name: '',
      permissions: {},
      assignableByAdmin: false
    });
  };

  const handleSave = async () => {
    try {
      if (editingRole) {
        await updateRole(editingRole, {
          name: formData.name,
          permissions: formData.permissions,
          assignableByAdmin: formData.assignableByAdmin
        });
        alert('Rola została zaktualizowana');
      } else {
        await createRole({
          id: formData.id,
          name: formData.name,
          permissions: formData.permissions,
          assignableByAdmin: formData.assignableByAdmin
        });
        alert('Rola została utworzona');
      }
      setEditingRole(null);
      setShowCreateForm(false);
    } catch (error) {
      alert('Błąd: ' + error.message);
    }
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę rolę?')) {
      return;
    }

    try {
      await deleteRole(roleId);
      alert('Rola została usunięta');
    } catch (error) {
      alert('Błąd: ' + error.message);
    }
  };

  const handlePermissionToggle = (permissionKey) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permissionKey]: !formData.permissions[permissionKey]
      }
    });
  };

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 ${themeClasses.card} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} text-white transition-colors`}
              >
                ← Powrót
              </button>
              <Shield className={themeClasses.text.primary} size={24} />
              <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                Zarządzanie Rolami
              </h1>
            </div>
            <button
              onClick={handleCreate}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} text-white transition-colors`}
            >
              <Plus size={20} />
              Dodaj rolę
            </button>
          </div>
        </div>
      </div>

      {/* Role List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.values(roles).map((role) => (
            <div
              key={role.id}
              className={`${themeClasses.card} border rounded-lg p-4 ${role.protected ? 'opacity-75' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className={`text-lg font-bold ${themeClasses.text.primary}`}>
                    {role.name}
                    {role.protected && (
                      <span className="ml-2 text-xs text-yellow-600">🔒 Chronione</span>
                    )}
                  </h3>
                  <p className={`text-sm ${themeClasses.text.muted}`}>ID: {role.id}</p>
                </div>
                {!role.protected && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(role)}
                      className={`p-2 rounded ${themeClasses.button.secondary} text-white`}
                      title="Edytuj"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className={`p-2 rounded ${themeClasses.button.danger} text-white`}
                      title="Usuń"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Permissions summary */}
              <div className="text-xs">
                <p className={`${themeClasses.text.secondary} mb-1`}>
                  Uprawnienia: {Object.values(role.permissions).filter(Boolean).length} aktywnych
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit/Create Form Modal */}
      {(editingRole || showCreateForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${themeClasses.card} rounded-lg shadow-xl max-w-4xl w-full border my-8`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${themeClasses.text.primary}`}>
                {editingRole ? 'Edytuj rolę' : 'Utwórz nową rolę'}
              </h2>
              <button
                onClick={() => {
                  setEditingRole(null);
                  setShowCreateForm(false);
                }}
                className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-1`}>
                    ID roli *
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    placeholder="np. moderator"
                    disabled={!!editingRole}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-1`}>
                    Nazwa roli *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    placeholder="np. Moderator"
                  />
                </div>
              </div>

              {/* Admin Assignment */}
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} rounded-lg p-4`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.assignableByAdmin}
                    onChange={(e) => setFormData({ ...formData, assignableByAdmin: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className={`text-sm font-medium ${themeClasses.text.primary}`}>
                      Może być nadawana przez Administratorów
                    </span>
                    <p className={`text-xs ${themeClasses.text.secondary} mt-1`}>
                      Jeśli zaznaczone, administratorzy (nie tylko super-admin) będą mogli przypisywać tę rolę użytkownikom.
                      Jeśli odznaczone, tylko Super Administrator będzie mógł nadać tę rolę.
                    </p>
                  </div>
                </label>
              </div>

              {/* Permissions */}
              <div>
                <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-4`}>
                  Uprawnienia
                </h3>
                <div className="space-y-4">
                  {Object.entries(allPermissions).map(([category, perms]) => (
                    <div key={category} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                      <h4 className={`font-medium ${themeClasses.text.primary} mb-3`}>
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((perm) => (
                          <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!formData.permissions[perm.key]}
                              onChange={() => handlePermissionToggle(perm.key)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className={`text-sm ${themeClasses.text.secondary}`}>
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex justify-end gap-2 p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setEditingRole(null);
                  setShowCreateForm(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} text-white`}
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} text-white`}
                disabled={!formData.id || !formData.name}
              >
                <Save size={16} />
                {editingRole ? 'Zapisz zmiany' : 'Utwórz rolę'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleManagementPanel;
