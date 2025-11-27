import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { Users, UserPlus, Edit, Trash2, Eye, EyeOff, History } from 'lucide-react';
import { CreateUserForm } from './CreateUserForm';
import { notify } from '../../utils/notifications';

export function UserManagementPanel({ darkMode, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [verificationPassword, setVerificationPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const { currentUser } = useAuth();
  const { isSuperAdmin, isAdminOrSuper, getAvailableRoles } = useRole();

  const themeClasses = darkMode ? {
    background: 'bg-gray-900',
    card: 'bg-gray-800 border-gray-700',
    text: {
      primary: 'text-white',
      secondary: 'text-gray-400',
      muted: 'text-gray-500'
    },
    input: 'bg-gray-700 border-gray-600 text-white',
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
    input: 'bg-white border-gray-300 text-gray-900',
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700',
      secondary: 'bg-gray-200 hover:bg-gray-300',
      danger: 'bg-red-600 hover:bg-red-700',
      success: 'bg-green-600 hover:bg-green-700'
    }
  };

  // Załaduj użytkowników
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sortuj: super-admin na górze, potem po dacie utworzenia
      usersList.sort((a, b) => {
        if (a.role === 'super-admin') return -1;
        if (b.role === 'super-admin') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      notify.error('Błąd podczas ładowania użytkowników');
    } finally {
      setLoading(false);
    }
  };

  // Czy można edytować użytkownika
  const canEditUser = (user) => {
    // Super-admin (gacek52) jest nietknięty
    if (user.email === 'gacek52@gmail.com' || user.role === 'super-admin') {
      return false;
    }

    // Super-admin może edytować wszystkich
    if (isSuperAdmin()) {
      return true;
    }

    // Admin może edytować tylko user/guest (nie innych adminów)
    if (isAdminOrSuper() && user.role !== 'admin' && user.role !== 'super-admin') {
      return true;
    }

    return false;
  };

  // Otwórz dialog potwierdzenia zmiany roli
  const handleChangeRole = (userId, newRole) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setPendingRoleChange({ userId, newRole, userName: user.email || user.displayName });
    setShowPasswordConfirm(true);
    setVerificationPassword('');
  };

  // Potwierdź zmianę roli po weryfikacji hasła
  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;

    // Sprawdź hasło weryfikacyjne (możesz dostosować hasło)
    const VERIFICATION_PASSWORD = 'admin2024'; // Zmień to na bezpieczniejsze hasło lub mechanizm

    if (verificationPassword !== VERIFICATION_PASSWORD) {
      notify.error('Nieprawidłowe hasło weryfikacyjne!');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', pendingRoleChange.userId), {
        role: pendingRoleChange.newRole,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.uid
      });

      await loadUsers();
      notify.success('Rola została zmieniona');
      setShowPasswordConfirm(false);
      setPendingRoleChange(null);
      setVerificationPassword('');
    } catch (error) {
      console.error('Error changing role:', error);
      notify.error('Błąd podczas zmiany roli');
    }
  };

  // Wyłącz/Aktywuj konto (soft delete)
  const handleToggleDisable = async (user) => {
    try {
      const newDisabledState = !user.disabled;

      await updateDoc(doc(db, 'users', user.id), {
        disabled: newDisabledState,
        disabledAt: newDisabledState ? new Date().toISOString() : null,
        disabledBy: newDisabledState ? currentUser.uid : null,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.uid
      });

      await loadUsers();
      notify.success(newDisabledState ? 'Konto zostało wyłączone' : 'Konto zostało aktywowane');
    } catch (error) {
      console.error('Error toggling disabled state:', error);
      notify.error('Błąd podczas zmiany stanu konta');
    }
  };

  // Otwórz edycję displayName
  const handleEditDisplayName = (user) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName || '');
  };

  // Zapisz displayName
  const handleSaveDisplayName = async () => {
    if (!editingUser) return;

    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        displayName: editDisplayName.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.uid
      });

      await loadUsers();
      setEditingUser(null);
      setEditDisplayName('');
      notify.success('Nazwa wyświetlania została zmieniona');
    } catch (error) {
      console.error('Error updating displayName:', error);
      notify.error('Błąd podczas zmiany nazwy');
    }
  };

  // Otwórz dialog potwierdzenia usunięcia
  const handleDeleteUser = (user) => {
    setPendingDelete(user);
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  // Potwierdź usunięcie użytkownika
  const confirmDeleteUser = async () => {
    if (!pendingDelete) return;

    // Sprawdź czy wpisano "TAK"
    if (deleteConfirmText !== 'TAK') {
      notify.warning('Musisz wpisać "TAK" aby potwierdzić usunięcie!');
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', pendingDelete.id));
      await loadUsers();
      notify.success('Użytkownik został usunięty');
      setShowDeleteConfirm(false);
      setPendingDelete(null);
      setDeleteConfirmText('');
    } catch (error) {
      console.error('Error deleting user:', error);
      notify.error('Błąd podczas usuwania użytkownika');
    }
  };

  // Pokaż historię logowań
  const handleShowHistory = (user) => {
    setSelectedUser(user);
    setShowHistory(true);
  };

  // Formatuj datę
  const formatDate = (dateString) => {
    if (!dateString) return 'Nigdy';
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL');
  };

  // Skrót dla długich emaili
  const truncateEmail = (email, maxLength = 25) => {
    if (!email) return '-';
    if (email.length <= maxLength) return email;
    return email.substring(0, maxLength - 3) + '...';
  };

  // Renderuj badge roli
  const renderRoleBadge = (role) => {
    const roleColors = {
      'super-admin': 'bg-purple-600 text-white',
      'admin': 'bg-blue-600 text-white',
      'user': 'bg-green-600 text-white',
      'guest': 'bg-gray-600 text-white'
    };

    const roleNames = {
      'super-admin': 'Super Admin',
      'admin': 'Admin',
      'user': 'User',
      'guest': 'Guest'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[role] || 'bg-gray-500 text-white'}`}>
        {roleNames[role] || role}
      </span>
    );
  };

  // Renderuj badge providera
  const renderProviderBadge = (provider) => {
    const providerColors = {
      'google': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'password': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'anonymous': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };

    const providerNames = {
      'google': 'Google',
      'password': 'Email/Pass',
      'anonymous': 'Guest'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs ${providerColors[provider] || 'bg-gray-100 text-gray-800'}`}>
        {providerNames[provider] || provider}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={themeClasses.text.secondary}>Ładowanie użytkowników...</p>
        </div>
      </div>
    );
  }

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
              <Users className={themeClasses.text.primary} size={24} />
              <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                Zarządzanie Użytkownikami
              </h1>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} text-white transition-colors`}
            >
              <UserPlus size={20} />
              Dodaj użytkownika
            </button>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className={`${themeClasses.card} border rounded-lg shadow-sm overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${themeClasses.text.secondary} uppercase tracking-wider`}>
                    Email / Nick
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${themeClasses.text.secondary} uppercase tracking-wider`}>
                    Metoda
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${themeClasses.text.secondary} uppercase tracking-wider`}>
                    Rola
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${themeClasses.text.secondary} uppercase tracking-wider`}>
                    Status
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${themeClasses.text.secondary} uppercase tracking-wider`}>
                    Ostatnie logowanie
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${themeClasses.text.secondary} uppercase tracking-wider`}>
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className={user.disabled ? 'opacity-50' : ''}>
                    <td className={`px-4 py-4 ${themeClasses.text.primary}`}>
                      <div>
                        <div className="font-medium">
                          {user.email || user.displayName || 'Brak nazwy'}
                        </div>
                        {user.displayName && user.email && (
                          <div className={`text-sm ${themeClasses.text.muted}`}>
                            {user.displayName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {renderProviderBadge(user.provider || 'google')}
                    </td>
                    <td className="px-4 py-4">
                      {canEditUser(user) ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          className={`${themeClasses.input} border rounded px-2 py-1 text-sm`}
                        >
                          {getAvailableRoles().map(role => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        renderRoleBadge(user.role)
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {user.disabled ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Wyłączone
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Aktywne
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-4 text-sm ${themeClasses.text.secondary}`}>
                      {formatDate(user.lastLogin)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {user.email === 'gacek52@gmail.com' ? (
                          <span className={`text-xs ${themeClasses.text.muted} italic`}>
                            🔒 Chronione
                          </span>
                        ) : (
                          <>
                            {/* Edytuj nazwę */}
                            {canEditUser(user) && (
                              <button
                                onClick={() => handleEditDisplayName(user)}
                                className={`p-1 rounded ${themeClasses.button.secondary} text-white`}
                                title="Edytuj nazwę wyświetlania"
                              >
                                <Edit size={16} />
                              </button>
                            )}

                            {/* Historia logowań */}
                            <button
                              onClick={() => handleShowHistory(user)}
                              className={`p-1 rounded ${themeClasses.button.secondary} text-white`}
                              title="Historia logowań"
                            >
                              <History size={16} />
                            </button>

                            {/* Wyłącz/Aktywuj */}
                            {canEditUser(user) && (
                              <button
                                onClick={() => handleToggleDisable(user)}
                                className={`p-1 rounded ${user.disabled ? themeClasses.button.success : themeClasses.button.secondary} text-white`}
                                title={user.disabled ? 'Aktywuj konto' : 'Wyłącz konto'}
                              >
                                {user.disabled ? <Eye size={16} /> : <EyeOff size={16} />}
                              </button>
                            )}

                            {/* Usuń */}
                            {canEditUser(user) && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className={`p-1 rounded ${themeClasses.button.danger} text-white`}
                                title="Usuń użytkownika"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statystyki */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`${themeClasses.card} border rounded-lg p-4`}>
            <div className={`text-sm ${themeClasses.text.secondary}`}>Wszyscy użytkownicy</div>
            <div className={`text-2xl font-bold ${themeClasses.text.primary}`}>{users.length}</div>
          </div>
          <div className={`${themeClasses.card} border rounded-lg p-4`}>
            <div className={`text-sm ${themeClasses.text.secondary}`}>Aktywne konta</div>
            <div className={`text-2xl font-bold ${themeClasses.text.primary}`}>
              {users.filter(u => !u.disabled).length}
            </div>
          </div>
          <div className={`${themeClasses.card} border rounded-lg p-4`}>
            <div className={`text-sm ${themeClasses.text.secondary}`}>Administratorzy</div>
            <div className={`text-2xl font-bold ${themeClasses.text.primary}`}>
              {users.filter(u => u.role === 'admin' || u.role === 'super-admin').length}
            </div>
          </div>
          <div className={`${themeClasses.card} border rounded-lg p-4`}>
            <div className={`text-sm ${themeClasses.text.secondary}`}>Goście</div>
            <div className={`text-2xl font-bold ${themeClasses.text.primary}`}>
              {users.filter(u => u.role === 'guest').length}
            </div>
          </div>
        </div>
      </div>

      {/* Historia logowań - Modal */}
      {showHistory && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-2xl ${themeClasses.card} rounded-lg shadow-xl`}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${themeClasses.text.primary}`}>
                Historia logowań - {selectedUser.email || selectedUser.displayName}
              </h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {selectedUser.loginHistory && selectedUser.loginHistory.length > 0 ? (
                <div className="space-y-2">
                  {[...selectedUser.loginHistory].reverse().map((login, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={themeClasses.text.primary}>
                          {formatDate(login.timestamp)}
                        </span>
                        <div className="flex items-center gap-2">
                          {renderProviderBadge(login.method)}
                          {login.success ? (
                            <span className="text-green-600 text-sm">✓ Sukces</span>
                          ) : (
                            <span className="text-red-600 text-sm">✗ Błąd</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={themeClasses.text.secondary}>Brak historii logowań</p>
              )}
            </div>
            <div className={`flex justify-end gap-2 p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setSelectedUser(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} text-white transition-colors`}
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal weryfikacji hasła przy zmianie roli */}
      {showPasswordConfirm && pendingRoleChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md ${themeClasses.card} rounded-lg shadow-xl`}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${themeClasses.text.primary}`}>
                🔒 Potwierdzenie zmiany roli
              </h2>
            </div>
            <div className="p-6">
              <p className={`mb-4 ${themeClasses.text.secondary}`}>
                Zmiana roli użytkownika <strong className={themeClasses.text.primary}>{pendingRoleChange.userName}</strong> wymaga weryfikacji.
              </p>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${themeClasses.text.secondary}`}>
                  Hasło weryfikacyjne
                </label>
                <input
                  type="password"
                  value={verificationPassword}
                  onChange={(e) => setVerificationPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && confirmRoleChange()}
                  className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                  placeholder="Wprowadź hasło weryfikacyjne"
                  autoFocus
                />
              </div>
              <p className={`text-xs ${themeClasses.text.muted} mb-4`}>
                💡 Domyślne hasło: admin2024 (zmień je w kodzie)
              </p>
            </div>
            <div className={`flex justify-end gap-2 p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setShowPasswordConfirm(false);
                  setPendingRoleChange(null);
                  setVerificationPassword('');
                  loadUsers(); // Odśwież aby przywrócić starą rolę w select
                }}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} text-white transition-colors`}
              >
                Anuluj
              </button>
              <button
                onClick={confirmRoleChange}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} text-white transition-colors`}
              >
                Potwierdź zmianę
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji nazwy wyświetlania */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md ${themeClasses.card} rounded-lg shadow-xl`}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${themeClasses.text.primary}`}>
                ✏️ Edytuj nazwę wyświetlania
              </h2>
            </div>
            <div className="p-6">
              <p className={`mb-4 ${themeClasses.text.secondary}`}>
                Użytkownik: <strong className={themeClasses.text.primary}>{editingUser.email || editingUser.displayName}</strong>
              </p>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${themeClasses.text.secondary}`}>
                  Nazwa wyświetlania
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveDisplayName()}
                  className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                  placeholder="Wprowadź nazwę wyświetlania"
                  autoFocus
                />
              </div>
              <p className={`text-xs ${themeClasses.text.muted}`}>
                Ta nazwa będzie wyświetlana jako właściciel kalkulacji
              </p>
            </div>
            <div className={`flex justify-end gap-2 p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setEditDisplayName('');
                }}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} text-white transition-colors`}
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveDisplayName}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} text-white transition-colors`}
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia */}
      {showDeleteConfirm && pendingDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md ${themeClasses.card} rounded-lg shadow-xl`}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${themeClasses.text.primary}`}>
                ⚠️ Potwierdzenie usunięcia konta
              </h2>
            </div>
            <div className="p-6">
              <p className={`mb-4 ${themeClasses.text.secondary}`}>
                Czy na pewno chcesz TRWALE USUNĄĆ konto:
              </p>
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-red-600 dark:text-red-400 font-bold text-center">
                  {pendingDelete.email || pendingDelete.displayName}
                </p>
              </div>
              <p className={`mb-4 text-sm ${themeClasses.text.muted}`}>
                ⚠️ Ta operacja jest nieodwracalna! Wszystkie dane użytkownika zostaną trwale usunięte.
              </p>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${themeClasses.text.secondary}`}>
                  Aby potwierdzić, wpisz <strong className="text-red-600">TAK</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && confirmDeleteUser()}
                  className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                  placeholder="Wpisz TAK"
                  autoFocus
                />
              </div>
            </div>
            <div className={`flex justify-end gap-2 p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPendingDelete(null);
                  setDeleteConfirmText('');
                }}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} text-white transition-colors`}
              >
                Anuluj
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={deleteConfirmText !== 'TAK'}
                className={`px-4 py-2 rounded-lg font-medium ${
                  deleteConfirmText === 'TAK'
                    ? themeClasses.button.danger
                    : 'bg-gray-400 cursor-not-allowed'
                } text-white transition-colors`}
              >
                Usuń konto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formularz tworzenia użytkownika */}
      {showCreateForm && (
        <CreateUserForm
          darkMode={darkMode}
          onClose={() => setShowCreateForm(false)}
          onUserCreated={(newUser) => {
            setShowCreateForm(false);
            loadUsers(); // Odśwież listę użytkowników
          }}
        />
      )}
    </div>
  );
}

export default UserManagementPanel;
